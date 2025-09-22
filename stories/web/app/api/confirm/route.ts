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
        ? "你是一个非常会讲故事的人。我会告诉你一个[主题]，然后通过[主题]，在三十秒以内搜索互联网寻找已经存在的故事。找到之后，把故事分类，告诉我你找到的故事结果，并把结果以 JSON 的方式回报：按类型分组（真实故事、历史故事、神话传说、科学知识、爱情故事、英雄故事），每组包含若干条目，每条目至少包含{title}，可选{yearOrEra, place, personOrProtagonist, oneLineWhyRelevant}。请只返回有匹配素材的类型，不要编造，也不要包含链接或引用。并给出简短的 confirmation_message，引导用户选择类别与条目。最终仅输出：{\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": {\"subject\": string, \"categories\": [{\"category\": string, \"items\": [{\"title\": string, \"yearOrEra\?: string, \"place\?: string, \"personOrProtagonist\?: string, \"oneLineWhyRelevant\?: string}]}]}}。"
        : "You are very good at telling stories. I will give you a [subject]. Within ~30 seconds, search the web for existing stories related to the subject. Then categorize what you found and return the results as JSON: group by type (Real, Historical, Myth/Legend, Scientific, Romantic/Love, Heroic). Each group should contain items with at least {title}, and optional {yearOrEra, place, personOrProtagonist, oneLineWhyRelevant}. Include only categories that have matches; do not invent content, and do not include links/citations. Also include a brief confirmation_message that prompts the user to choose a category and an item. Output JSON only: {\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": {\"subject\": string, \"categories\": [{\"category\": string, \"items\": [{\"title\": string, \"yearOrEra\?: string, \"place\?: string, \"personOrProtagonist\?: string, \"oneLineWhyRelevant\?: string}]}]}}.";

    if (!process.env.OPENAI_API_KEY) {
      const fallback =
        language === "zh"
          ? `我将为你讲述一个大约 5 分钟的故事，主题是「${prefs.subject}」。我会综合事实与趣味元素。可以开始吗？`
          : `I'll tell a ~5 minute story about "${prefs.subject}" balancing facts and fun. Shall we begin?`;
      return NextResponse.json({ message: fallback });
    }

    const openai = getOpenAI();
    const userPayload = { subject: prefs.subject };
    const resp = await openai.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.7,
      max_tokens: 1100,
    });

    const content = resp.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback minimal structure
      parsed = {
        confirmation_message:
          language === "zh"
            ? `已找到主题「${prefs.subject}」的若干故事类别，请选择类别、年龄和时长。`
            : `Found some categories for "${prefs.subject}". Please choose a category, age, and length to continue.`,
        normalized_prefs: { ...prefs },
        findings: { subject: prefs.subject, categories: [] },
      };
    }

    return NextResponse.json({
      confirmation_message: parsed.confirmation_message,
      normalized_prefs: parsed.normalized_prefs ?? { ...prefs },
      findings: parsed.findings && typeof parsed.findings === "object" ? parsed.findings : { subject: prefs.subject, categories: [] },
      debug_prompt: { system, user: JSON.stringify(userPayload) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}


