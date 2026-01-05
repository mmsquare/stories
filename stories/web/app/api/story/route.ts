import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, defaultModel } from "@/lib/openai";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
  categories: z.array(z.string()).optional(),
  age: z.number().optional(),
  lengthMinutes: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const prefs = schema.parse(json);
    if (!process.env.OPENAI_API_KEY) {
      const text =
        prefs.language === "zh"
          ? "这是一个占位符故事文本（约5分钟）。真正的内容会在连接到 OpenAI 后生成。"
          : "This is a placeholder story text (~5 minutes). Real content will be generated when OpenAI is configured.";
      return NextResponse.json({ text, segments: [text] });
    }
    const openai = getOpenAI();

    // Prepare variables for prompts
    const audienceAge = prefs.age ?? 21;
    const minutes = prefs.lengthMinutes ?? 5;
    const categories = (prefs.categories && prefs.categories.length > 0) ? prefs.categories : [];
    // Duration is per story (not total)
    const perStoryMinutes = Math.max(2, minutes);

    // Combine system + user into one prompt
    const prefsPayload = JSON.stringify(
      { subject: prefs.subject, categories, age: audienceAge, minutes },
      null,
      2
    );

    const combinedPrompt =
      prefs.language === "zh"
        ? [
            "你是一位知识渊博、非常会讲故事的讲述者。",
            `讲一个好的故事，与${prefs.subject}相关的、已经在流传或者可核实的故事，不要编造或新创作故事。`,
            "把故事内容讲述清楚，并且引人入胜，人物鲜明。故事最后不需要升华故事的意义；只讲完整一个故事即可。",
            `请优先从“${categories.join("、") || "神话/传说"}”类别进行搜索与筛选，受众年龄为${audienceAge}岁；`,
            `将其整理为完整、连贯的叙事，适合 AI 配音；目标阅读时长约${perStoryMinutes}分钟。`,
            "按故事发展合理划分段落，段与段之间以一个空行分隔；每段约1-3句；语言自然流畅、细节充分，避免列表或提纲式句子。",
            "只返回 JSON，不要任何解释或代码块标记。结构严格为：{\"stories\":[{\"subject\":string,\"category\":string,\"text\":string,\"segments\":string[],\"reference\":string}]}。",
            "text 为全文（按段落以一个空行拼接）；segments 为逐段的字符串数组；reference 填写公开可访问的来源链接，若无则填空字符串。",
            prefsPayload
          ].join("\n")
        : [
            "You are a knowledgeable, highly engaging storyteller.",
            `Tell one good story related to ${prefs.subject} that already exists and can be verified; do not invent or create new content.`,
            "Make it clear, engaging, and character-driven. Do not add a moral conclusion; simply tell one complete story.",
            `Prioritize searching and screening from the categories: “${categories.join(", ") || "Myth/Legend"}”; audience age is ${audienceAge}.`,
            `Organize it into a complete, coherent narrative suitable for AI voice-over; target reading time is about ${perStoryMinutes} minutes.`,
            "Divide into paragraphs by narrative flow, each ~1-3 sentences, separated by one blank line; use natural, fluent, richly detailed language; avoid list- or outline-style output.",
            "Output JSON only. No explanations, no code fences. Exact structure: {\"stories\":[{\"subject\":string,\"category\":string,\"text\":string,\"segments\":string[],\"reference\":string}]}",
            "text is the full story (paragraphs joined with one blank line); segments is the array of paragraph strings; reference is a publicly accessible source link, or an empty string if none.",
 
            prefsPayload
          ].join("\n")

    // Use Responses API for gpt-5 models; otherwise use Chat Completions
    const model = defaultModel;
    let raw = "";
    let usedModel = model;
    try {
      if (/^gpt-5/i.test(model)) {
        const r: any = await (openai as any).responses.create({
          model,
          input: combinedPrompt,
          max_output_tokens: 3200,
          text: { format: { type: "json_object" } },
        });
        raw = (r?.output_text as string) || "";
        if (!raw && Array.isArray(r?.output)) {
          for (const item of r.output) {
            const contents = item?.content || [];
            for (const c of contents) {
              // If the Responses API returns structured JSON, use it directly
              if (c?.json && typeof c.json === "object") { raw = JSON.stringify(c.json); break; }
              if (typeof c?.text === "string" && c.text.trim().length > 0) { raw = c.text; break; }
              if (c?.type === "output_text" && typeof c?.text === "string" && c.text.trim().length > 0) { raw = c.text; break; }
              if (c?.type === "text" && typeof c?.text === "string" && c.text.trim().length > 0) { raw = c.text; break; }
            }
            if (raw) break;
          }
        }
        console.log("[StoryAPI] OpenAI (Responses) raw length:", raw?.length || 0);
        try { console.log("[StoryAPI] OpenAI (Responses) RAW:\n", raw); } catch {}
      } else {
        const r = await openai.chat.completions.create({
          model,
          messages: [
            { role: "user", content: combinedPrompt },
          ],
          max_completion_tokens: 3200,
        });
        raw = r.choices?.[0]?.message?.content || "";
        console.log("[StoryAPI] OpenAI (Chat) raw length:", raw?.length || 0);
        try { console.log("[StoryAPI] OpenAI (Chat) RAW:\n", raw); } catch {}
      }

      // Automatic fallback if primary path returned empty
      if (!raw || raw.trim().length === 0) {
        const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || "gpt-4o-mini";
        try {
          const fr = await openai.chat.completions.create({
            model: fallbackModel,
            messages: [{ role: "user", content: combinedPrompt }],
            max_completion_tokens: 3000,
          });
          usedModel = fallbackModel;
          raw = fr.choices?.[0]?.message?.content || "";
          console.log("[StoryAPI] Fallback model used:", fallbackModel, "raw length:", raw?.length || 0);
          try { console.log("[StoryAPI] Fallback RAW:\n", raw); } catch {}
        } catch (fe: any) {
          console.warn("[StoryAPI] Fallback model failed:", fe?.message || String(fe));
        }
      }
    } catch (err: any) {
      const fallbackText = prefs.language === "zh" ? "生成失败" : "Generation failed";
      return NextResponse.json({ text: fallbackText, segments: [fallbackText], error: err?.message || String(err), debug_prompt: { prompt: combinedPrompt, variables: prefsPayload, model, raw: "" } }, { status: 200 });
    }
    const cleaned = raw.replace(/```json|```/gi, "").trim();
    console.log("[StoryAPI] Cleaned model output (first 500 chars):\n", cleaned.slice(0, 500));
    let parsed: any;
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return undefined; } };
    parsed = tryParse(cleaned);
    if (!parsed) {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = tryParse(cleaned.slice(start, end + 1));
      }
    }
    console.log("[StoryAPI] Parsed keys:", parsed ? Object.keys(parsed) : null);
    if (!parsed) {
      // Fallback: wrap raw text into JSON, split paragraphs
      const rawText: string = cleaned || "";
      const fallbackText = prefs.language === "zh" ? "生成失败" : "Generation failed";
      const segs = rawText
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);
      const textOrFallback = rawText || fallbackText;
      parsed = { text: textOrFallback, segments: segs.length ? segs : [textOrFallback] };
    }
    // Normalize stories array
    let stories: any[] = Array.isArray(parsed?.stories) ? parsed.stories : [];
    // Fallback: if the model returned a single object with text/segments, coerce into stories[0]
    if ((!stories || stories.length === 0) && parsed && typeof (parsed as any).text === "string" && (parsed as any).text.trim().length > 0) {
      stories = [{
        subject: (parsed as any).subject || prefs.subject,
        category: (parsed as any).category || (categories[0] || ""),
        text: (parsed as any).text,
        segments: Array.isArray((parsed as any).segments) ? (parsed as any).segments : undefined,
        reference: typeof (parsed as any).reference === "string" ? (parsed as any).reference : undefined,
      }];
      console.log("[StoryAPI] Coerced single-object response into stories[0]");
    }
    const normalizeSegments = (arr: any): string[] => Array.isArray(arr)
      ? arr.map((seg: any) => {
          if (typeof seg === "string") return seg;
          if (seg && typeof seg === "object") {
            const candidate = (seg as any).paragraph || (seg as any).text || (seg as any).content || (seg as any).value;
            if (typeof candidate === "string") return candidate;
          }
          return "";
        }).filter((s: string) => s.length > 0)
      : [];

    let variants = stories.map((s) => ({
      subject: typeof s.subject === "string" ? s.subject : prefs.subject,
      category: typeof s.category === "string" ? s.category : (categories[0] || ""),
      text: typeof s.text === "string" ? s.text : "",
      segments: normalizeSegments(s.segments) || (typeof s.text === "string" ? s.text.split(/\n{2,}/).map((x:string)=>x.trim()).filter(Boolean) : []),
      reference: typeof s.reference === "string" ? s.reference : undefined,
    })).filter((v) => v.text && v.segments && v.segments.length > 0);
    // Restrict to 1 story only per request
    variants = variants.slice(0, 1);
    console.log("[StoryAPI] Variants count:", variants.length);

    // Choose the first variant as the primary display; if variants are empty, fall back to parsed/raw text
    let first: { text: string; segments: string[] } = variants[0] as any;
    if (!first) {
      const fallbackText: string | undefined = typeof (parsed as any)?.text === "string" && (parsed as any).text.trim().length > 0
        ? (parsed as any).text
        : (cleaned || undefined);
      if (fallbackText) {
        const segs = normalizeSegments((parsed as any)?.segments) || fallbackText.split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean);
        first = { text: fallbackText, segments: segs.length ? segs : [fallbackText] };
      } else {
        first = { text: prefs.language === "zh" ? "生成失败" : "Generation failed", segments: [] };
      }
    }

    return NextResponse.json({
      text: first.text,
      segments: first.segments,
      variants,
      debug_prompt: { prompt: combinedPrompt, variables: prefsPayload, model: usedModel, raw: cleaned },
    });
  } catch (e: any) {
    // Final fallback: placeholder minimal story to avoid client hard error
    const fallbackText = "This is a placeholder story. Please try again.";
    return NextResponse.json({ text: fallbackText, segments: [fallbackText], error: e?.message }, { status: 200 });
  }
}


