import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, defaultModel } from "@/lib/openai";

export const runtime = "nodejs";

// Deprecated route. Keeping a minimal handler to preserve compatibility if invoked.
const schema = z.object({
  subject: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const prefs = schema.parse(json);
    const language = prefs.language;

    return NextResponse.json({
      message: language === "zh" ? "已跳过确认步骤" : "Confirmation step removed",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}


