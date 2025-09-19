"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStories } from "@/store/useStories";
import { toast } from "sonner";

export default function StoryPage() {
  const { current, saveCurrent, remove, saved } = useStories();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

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


  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <button onClick={() => history.back()} className="text-sm text-black/60 dark:text-white/60 mb-4">
        ← {current?.language === "zh" ? "返回" : "Back"}
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold mb-4">{current?.subject || "Story"}</h1>
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
        <button
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;
            if (el.paused) {
              el.play();
              setPlaying(true);
            } else {
              el.pause();
              setPlaying(false);
            }
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {playing ? (current?.language === "zh" ? "暂停" : "Pause") : (current?.language === "zh" ? "播放" : "Play")}
        </button>
        <audio
          ref={audioRef}
          controls
          className="hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </div>

    </div>
  );
}


