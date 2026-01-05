"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStories } from "@/store/useStories";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";

export default function StoryPage() {
  const { current, updateCurrent, saveCurrent, remove, saved } = useStories();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsProgressTarget, setTtsProgressTarget] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onError = () => toast.error(current?.language === "zh" ? "播放失败" : "Playback error");
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [audioRef.current]);

  useEffect(() => {
    if (audioRef.current && current?.audioUrl) {
      audioRef.current.src = current.audioUrl;
    }
  }, [current?.audioUrl]);

  const text = useMemo(() => current?.text || "", [current?.text]);
  const segments = useMemo(() => current?.segments || (text ? [text] : []), [current?.segments, text]);
  const variants = current?.variants || [];
  const idx = current?.currentVariantIndex ?? 0;

  const handleGenerateOrToggle = async () => {
    if (!current) return;
    if (!current.audioUrl) {
      try {
        setTtsBusy(true);
        setTtsProgress(0.05);
        setTtsProgressTarget(0.15);
        const ttsBase = process.env.NEXT_PUBLIC_TTS_BASE || "";
        if (!ttsBase) { toast.error(current.language === 'zh' ? '未配置配音服务器' : 'TTS server not configured'); setTtsBusy(false); return; }
        const paragraphs = segments;
        const chunks: string[] = [];
        let buf = '';
        for (const p of paragraphs) {
          if ((buf + '\n\n' + p).length > 2800) { if (buf) chunks.push(buf); buf = p; } else { buf = buf ? (buf + '\n\n' + p) : p; }
        }
        if (buf) chunks.push(buf);
        const parts: Blob[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const resp = await fetch(`${ttsBase}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: chunks[i], language: current.language }) });
          if (!resp.ok) throw new Error(await resp.text());
          parts.push(await resp.blob());
          setTtsProgressTarget((t) => Math.max(t, Math.min(0.9, ((i + 1) / chunks.length) * 0.9)));
        }
        const merged = new Blob(parts, { type: parts[0]?.type || 'audio/mpeg' });
        const url = URL.createObjectURL(merged);
        updateCurrent({ audioUrl: url });
        setTtsProgressTarget(1.0);
        setTtsBusy(false);
        setPlaying(false);
      } catch (e) {
        console.error('[TTS]', e);
        toast.error(current.language === 'zh' ? '配音失败' : 'TTS failed');
        setTtsBusy(false);
      }
      return;
    }
    const el = audioRef.current; if (!el) return; if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  // Smooth progress easing toward target while TTS is busy
  useEffect(() => {
    if (!ttsBusy) return;
    let raf = 0;
    const tick = () => {
      setTtsProgress((p) => {
        const delta = (ttsProgressTarget - p) * 0.08;
        let next = p + delta;
        if (Math.abs(ttsProgressTarget - next) < 0.002) next = ttsProgressTarget;
        return Math.max(0, Math.min(1, next));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ttsBusy, ttsProgressTarget]);

  // Gradually advance target to avoid abrupt jumps during long chunks
  useEffect(() => {
    if (!ttsBusy) return;
    const cap = 0.85; // don't reach full until chunks are done
    const id = setInterval(() => {
      setTtsProgressTarget((t) => Math.min(cap, t + 0.01));
    }, 200);
    return () => clearInterval(id);
  }, [ttsBusy]);


  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <button onClick={() => history.back()} className="text-sm text-black/60 dark:text-white/60 mb-4">
        ← {current?.language === "zh" ? "返回" : "Back"}
      </button>
      <div className="flex items-center justify-between">
        <div className="mb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-semibold">{current?.subject || "Story"}</h1>
            <button
              onClick={handleGenerateOrToggle}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-sm"
              disabled={ttsBusy}
            >
              {current?.audioUrl ? (
                <span className="flex items-center gap-2">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? (current?.language === 'zh' ? '暂停' : 'Pause') : (current?.language === 'zh' ? '播放' : 'Play')}</span>
              ) : (
                <span className="relative inline-block min-w-[7rem] text-center">
                  {current?.language === 'zh' ? '生成配音' : 'Generate Voice'}
                  {ttsBusy && (
                    <span className="absolute inset-x-0 -bottom-1 h-1 bg-indigo-300/50 rounded">
                      <span className="block h-full bg-white rounded" style={{ width: `${Math.round(ttsProgress*100)}%` }} />
                    </span>
                  )}
                </span>
              )}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {!!current?.subject && (
              <span className="text-[11px] px-2 py-1 rounded-md bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10">{current.subject}</span>
            )}
            {!!current?.category && (
              <span className="text-[11px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{current.category}</span>
            )}
            {/* Age tag removed per request */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {current && saved.some((s) => s.id === current.id) ? (
            <span className="text-xs px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              {current.language === "zh" ? "已保存" : "Saved"}
            </span>
          ) : (
            <button
              onClick={() => { saveCurrent(); toast.success(current?.language === "zh" ? "已保存" : "Story saved"); }}
              className="text-xs px-3 py-1 rounded-lg bg-emerald-600 text-white"
            >
              {current?.language === "zh" ? "保存" : "Save"}
            </button>
          )}
          <button onClick={() => { if (current) { remove(current.id); toast.success(current.language === "zh" ? "已删除" : "Deleted"); history.back(); } }} className="text-xs px-3 py-1 rounded-lg bg-rose-600 text-white">{current?.language === "zh" ? "删除" : "Delete"}</button>
        </div>
      </div>
      <div className="space-y-4">
        {segments.map((seg, i) => (
          <p key={i} className="leading-7 text-[15px] text-black/85 dark:text-white/85">
            {seg}
          </p>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        {variants.length > 1 && (
          <button
            onClick={() => {
              if (!current) return;
              const next = Math.min((current.currentVariantIndex ?? 0) + 1, variants.length - 1);
              updateCurrent({ currentVariantIndex: next, text: variants[next].text, segments: variants[next].segments, category: variants[next].category || current.category });
              setPlaying(false);
            }}
            className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg黑色/10 dark:hover:bg白色/20"
          >
            {current?.language === 'zh' ? '下一则' : 'Next story'}
          </button>
        )}
        <audio
          ref={audioRef}
          controls
          className="hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </div>

      {variants.length > 0 && variants[(current?.currentVariantIndex ?? 0)]?.reference && (
        <div className="mt-6 text-sm">
          <a
            href={variants[(current?.currentVariantIndex ?? 0)].reference as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            {current?.language === 'zh' ? '参考链接' : 'Reference link'}
          </a>
        </div>
      )}

    </div>
  );
}


