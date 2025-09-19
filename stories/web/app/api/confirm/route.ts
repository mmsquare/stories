import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, defaultModel } from "@/lib/openai";

export const runtime = "nodejs";

const schema = z.object({
  subject: z.string().min(1),
  audienceAge: z.string().optional(),
  fictionLevel: z.string().optional(),
  lengthMinutes: z.number().optional(),
  language: z.enum(["en", "zh"]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const prefs = schema.parse(json);
    const language = prefs.language;

    const system =
      language === "zh"
        ? "你是儿童故事的研究与策划助手。基于用户的主题，访问真实网络30秒以内，然后产出若干条简明要点（findings），然后给出一个约5分钟的故事大纲（outline），包含开场/背景/推进/高潮/结尾等部分。最后生成简短的中文确认语（confirmation_message），复述主题、时长和风格。只输出JSON对象：{\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": string[], \"outline\": string[] }。"
        : "You are a kids-friendly research+planning assistant. Do an actual web search under 30 seconds, simulate a research: produce a few concise factual bullets (findings), then a ~5-minute outline (outline) with sections like opening/background/build-up/climax/closing. Finally produce a short English confirmation_message that restates subject, length, and style. Output only JSON: {\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": string[], \"outline\": string[] }.";

    if (!process.env.OPENAI_API_KEY) {
      const fallback =
        language === "zh"
          ? `我将为你讲述一个大约 5 分钟的故事，主题是「${prefs.subject}」。我会综合事实与趣味元素。可以开始吗？`
          : `I'll tell a ~5 minute story about "${prefs.subject}" balancing facts and fun. Shall we begin?`;
      return NextResponse.json({ message: fallback });
    }

    const openai = getOpenAI();
    const userPayload = { subject: prefs.subject, audienceAge: prefs.audienceAge, fictionLevel: prefs.fictionLevel, lengthMinutes: prefs.lengthMinutes ?? 5 };
    const resp = await openai.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.7,
      max_tokens: 900,
    });

    const content = resp.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const fallback = {
        confirmation_message: language === "zh" ? `我将为你讲述一个大约 5 分钟的故事，主题是「${prefs.subject}」。可以开始吗？` : `I'll tell a ~5 minute story about "${prefs.subject}". Shall we begin?`,
        normalized_prefs: { ...prefs, lengthMinutes: prefs.lengthMinutes ?? 5 },
        findings: [],
        outline: [],
      };
      parsed = fallback;
    }

    return NextResponse.json({
      confirmation_message: parsed.confirmation_message,
      normalized_prefs: parsed.normalized_prefs ?? { ...prefs, lengthMinutes: prefs.lengthMinutes ?? 5 },
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      outline: Array.isArray(parsed.outline) ? parsed.outline : [],
      debug_prompt: { system, user: JSON.stringify(userPayload) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}


