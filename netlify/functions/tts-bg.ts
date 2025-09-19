import type { Handler } from "@netlify/functions";

// In-memory job store (ephemeral). For production, store in Redis/DB.
const jobs = new Map<string, { status: "pending" | "done" | "error"; url?: string; error?: string }>();

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}") as { text?: string; language?: "en" | "zh" };
      const text = body.text || "";
      const language = body.language === "zh" ? "zh" : "en";
      if (!text) return { statusCode: 400, body: JSON.stringify({ error: "Missing text" }) };

      const jobId = (globalThis.crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      jobs.set(jobId, { status: "pending" });

      // Kick off background work
      setTimeout(async () => {
        try {
          const apiKey = process.env.ELEVENLABS_API_KEY;
          const voiceId = language === "zh" ? process.env.ELEVENLABS_VOICE_ZH : process.env.ELEVENLABS_VOICE_EN;
          if (!apiKey || !voiceId) throw new Error("Missing ELEVENLABS config");

          const modelId = process.env.ELEVENLABS_MODEL_ID;
          const payload: any = { text, output_format: "mp3_44100_128" };
          if (modelId) payload.model_id = modelId;
          const voiceSettings = process.env.ELEVENLABS_VOICE_SETTINGS;
          if (voiceSettings) {
            try { payload.voice_settings = JSON.parse(voiceSettings); } catch {}
          }

          const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error(await resp.text());
          const buffer = Buffer.from(await resp.arrayBuffer());
          const dataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;
          jobs.set(jobId, { status: "done", url: dataUrl });
        } catch (e: any) {
          jobs.set(jobId, { status: "error", error: e?.message || "TTS failed" });
        }
      }, 0);

      return { statusCode: 202, body: JSON.stringify({ jobId }) };
    }

    if (event.httpMethod === "GET") {
      const jobId = (event.queryStringParameters || {}).jobId;
      if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: "Missing jobId" }) };
      const job = jobs.get(jobId);
      if (!job) return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
      return { statusCode: 200, body: JSON.stringify(job) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: e?.message || "Server error" }) };
  }
};
