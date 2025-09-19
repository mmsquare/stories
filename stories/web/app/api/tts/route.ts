import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { text, language } = schema.parse(json);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }
    const voiceId = language === "zh" ? process.env.ELEVENLABS_VOICE_ZH : process.env.ELEVENLABS_VOICE_EN;
    if (!voiceId) {
      return NextResponse.json({ error: "Missing ELEVENLABS_VOICE_EN/ZH" }, { status: 500 });
    }

    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify((() => {
        const payload: any = { text, output_format: "mp3_44100_128" };
        const modelId = process.env.ELEVENLABS_MODEL_ID;
        if (modelId) payload.model_id = modelId;
        const voiceSettings = process.env.ELEVENLABS_VOICE_SETTINGS;
        if (voiceSettings) {
          try { payload.voice_settings = JSON.parse(voiceSettings); } catch {}
        }
        return payload;
      })()),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad request" }, { status: 400 });
  }
}


