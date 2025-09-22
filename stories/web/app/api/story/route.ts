import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, defaultModel } from "@/lib/openai";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
  category: z.string().optional(),
  age: z.number().optional(),
  lengthMinutes: z.number().optional(),
  chosenItem: z
    .object({
      title: z.string(),
      yearOrEra: z.string().optional(),
      place: z.string().optional(),
      personOrProtagonist: z.string().optional(),
    })
    .optional(),
  findings: z
    .object({
      subject: z.string(),
      categories: z
        .array(
          z.object({
            category: z.string(),
            items: z
              .array(
                z.object({
                  title: z.string(),
                  yearOrEra: z.string().optional(),
                  place: z.string().optional(),
                  personOrProtagonist: z.string().optional(),
                  oneLineWhyRelevant: z.string().optional(),
                })
              )
              .optional(),
            highlights: z.array(z.string()).optional(),
          })
        )
        .default([]),
    })
    .optional(),
  mode: z.enum(["real", "makeup"]).optional(),
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
    const selectedTitle = prefs.chosenItem?.title || prefs.subject;
    const audienceAge = prefs.age ?? 8;
    const minutes = prefs.lengthMinutes ?? 5;

    const sys =
      prefs.language === "zh"
        ? `你是一位优秀的故事讲述者。请为${audienceAge}岁儿童写一个连贯、易读、适合之后做 AI 语音朗读的故事；阅读时长约为${minutes}分钟。使用清晰的自然段落划分，每段 1-3 句，语言简洁、流畅。不要包含链接、列表或多余说明。严格只输出 JSON：{"text": 故事全文, "segments": 自然段字符串数组}。`
        : `You are a great storyteller. Write a coherent story tailored for a ${audienceAge}-year-old child, with an approximate reading duration of ${minutes} minutes, ideal for AI text-to-speech. Use clear paragraphs (1–3 sentences each), concise and fluent language. Do not include links, lists, or extra commentary. Output strictly JSON only: {"text": full story, "segments": array of paragraph strings}.`;

    // Build the user prompt as requested once a story is selected
    const userPrompt =
      prefs.language === "zh"
        ? `那你给我讲一个「${selectedTitle}」的故事。要求面对${audienceAge}岁小孩，故事阅读时常在${minutes}分钟左右。把这个故事连贯地写下来，一方面方便阅读的段落，第二方便之后发给 AI 语音阅读出来。`
        : `Please tell the story of "${selectedTitle}". Target audience: ${audienceAge}-year-old children. Reading time about ${minutes} minutes. Write it coherently with clear paragraphs for reading and suitable for AI TTS later.`;

    const resp = await openai.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.45,
      max_tokens: 2400,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json|```/gi, "").trim();
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
    if (!parsed) {
      // Fallback: wrap raw text into JSON, split paragraphs
      const text: string = cleaned || "";
      const segments = text
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);
      parsed = { text: text || (prefs.language === "zh" ? "生成失败" : "Generation failed"), segments: segments.length ? segments : [text] };
    }
    // Legacy safeguard: ignore previous verification branch
    // Normalize segments to string[] in case the model returns objects like { text: "..." }
    const normSegments: string[] = Array.isArray(parsed.segments)
      ? parsed.segments
          .map((seg: unknown) => {
            if (typeof seg === "string") return seg;
            if (seg && typeof seg === "object") {
              const o = seg as Record<string, unknown>;
              const candidate = (o as any).paragraph || (o as any).text || (o as any).content || (o as any).value;
              if (typeof candidate === "string") return candidate;
              return ""; // skip non-string objects
            }
            return ""; // skip non-strings
          })
          .filter((s: string) => s.length > 0)
      : [];

    return NextResponse.json({
      text: typeof parsed.text === "string" ? parsed.text : (prefs.language === "zh" ? "生成失败" : "Generation failed"),
      segments: normSegments.length ? normSegments : (typeof parsed.text === "string" ? [parsed.text] : []),
      debug_prompt: {
        system: sys,
        user: userPrompt,
      },
    });
  } catch (e: any) {
    // Final fallback: placeholder minimal story to avoid client hard error
    const fallbackText = "This is a placeholder story. Please try again.";
    return NextResponse.json({ text: fallbackText, segments: [fallbackText], error: e?.message }, { status: 200 });
  }
}


