import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, defaultModel } from "@/lib/openai";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
  audienceAge: z.string().optional(),
  fictionLevel: z.string().optional(),
  lengthMinutes: z.number().optional(),
  findings: z.array(z.string()).default([]),
  outline: z.array(z.string()).default([]),
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

    const sys =
      prefs.language === "zh"
        ? "根据提供的要点（findings）和大纲（outline），写出完整故事（约5分钟阅读时间）。请分成自然段。最终只输出JSON对象：{\"text\": 故事全文, \"segments\": 段落数组 }，不要输出其它内容。灵活结合地理，历史，人文，传说故事。语气温暖、适合儿童，兼顾知识性。"
        : "Using the provided findings and outline, write the full story (~5 minutes reading time). Split into natural paragraphs. Only output a JSON object: {\"text\": full story, \"segments\": array of paragraph strings } and nothing else. Flexibly combine geography, history, culture, and legend. Warm, kid-friendly tone; educational yet fun.";

    const resp = await openai.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify({ subject: prefs.subject, findings: prefs.findings, outline: prefs.outline, audienceAge: prefs.audienceAge, fictionLevel: prefs.fictionLevel, lengthMinutes: prefs.lengthMinutes ?? 5 }) },
      ],
      temperature: 0.7,
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
        user: JSON.stringify({ subject: prefs.subject, findings: prefs.findings, outline: prefs.outline, audienceAge: prefs.audienceAge, fictionLevel: prefs.fictionLevel, lengthMinutes: prefs.lengthMinutes ?? 5 }),
      },
    });
  } catch (e: any) {
    // Final fallback: placeholder minimal story to avoid client hard error
    const fallbackText = "This is a placeholder story. Please try again.";
    return NextResponse.json({ text: fallbackText, segments: [fallbackText], error: e?.message }, { status: 200 });
  }
}


