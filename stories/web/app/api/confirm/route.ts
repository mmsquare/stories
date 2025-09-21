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
        ? "你是一个故事策划者。基于用户给定的[subject]，进行不超过30秒的真实网络检索，找出现有的故事类型与候选素材，类型限定为：Real、Historical、Fantasy、Folk/Legendary、Scientific、Adventure、Romantic、Epic/Heroic、Satirical/Moral。只返回存在匹配素材的类型；如果某类型没有匹配，不要编造，也不要把该类型加入结果。请只输出一个JSON对象 findings：{\"subject\": string, \"categories\": [{\"category\": string, \"highlights\": string[]}]}，其中 highlights 为该类型可讲述的故事线索/要点（每项不超过1句）。此外，再输出一个简短的中文确认语 confirmation_message，复述主题，提示已找到的类别，并引导用户选择类别、年龄与时长。最终只输出JSON对象：{\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": {subject, categories: {category, highlights[]}[]} }。"
        : "You are a story planner. Based on the user's [subject], perform up to ~30 seconds of real web searching to find existing stories across these categories only: Real, Historical, Fantasy, Folk/Legendary, Scientific, Adventure, Romantic, Epic/Heroic, Satirical/Moral. Return ONLY categories that have matching material; do not invent or include empty categories. Output a single JSON object 'findings': {\"subject\": string, \"categories\": [{\"category\": string, \"highlights\": string[]}]}, where 'highlights' are concise one-line cues for possible stories in that category. Also include a brief English confirmation_message that restates the subject, lists found categories, and prompts the user to choose a category, age, and length. Final output must be JSON: {\"confirmation_message\": string, \"normalized_prefs\": {...}, \"findings\": {subject, categories: [{category, highlights: string[]}]}}.";

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


