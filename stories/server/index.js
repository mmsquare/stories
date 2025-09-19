const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/tts', async (req, res) => {
  try {
    const { text, language } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = language === 'zh' ? process.env.ELEVENLABS_VOICE_ZH : process.env.ELEVENLABS_VOICE_EN;
    if (!apiKey || !voiceId) return res.status(500).json({ error: 'Missing ELEVENLABS config' });

    const payload = { text, output_format: 'mp3_44100_128' };
    if (process.env.ELEVENLABS_MODEL_ID) payload.model_id = process.env.ELEVENLABS_MODEL_ID;
    if (process.env.ELEVENLABS_VOICE_SETTINGS) {
      try { payload.voice_settings = JSON.parse(process.env.ELEVENLABS_VOICE_SETTINGS); } catch {}
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return res.status(502).send(await resp.text());

    const buffer = Buffer.from(await resp.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`TTS server listening on :${port}`));
