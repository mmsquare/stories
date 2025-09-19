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
      temperature: 0.8,
      max_tokens: 1600,
    });

    const content = resp.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: wrap raw text into JSON, split paragraphs
      const text: string = content || "";
      const segments = text
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);
      parsed = { text: text || (prefs.language === "zh" ? "生成失败" : "Generation failed"), segments: segments.length ? segments : [text] };
    }
    return NextResponse.json({ ...parsed, debug_prompt: { system: sys, user: JSON.stringify({ subject: prefs.subject, findings: prefs.findings, outline: prefs.outline, audienceAge: prefs.audienceAge, fictionLevel: prefs.fictionLevel, lengthMinutes: prefs.lengthMinutes ?? 5 }) } });
  } catch (e: any) {
    // Final fallback: placeholder minimal story to avoid client hard error
    const fallbackText = "This is a placeholder story. Please try again.";
    return NextResponse.json({ text: fallbackText, segments: [fallbackText], error: e?.message }, { status: 200 });
  }
}


