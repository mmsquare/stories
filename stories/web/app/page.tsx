"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BreathingBubble from "@/components/BreathingBubble";
import PromptInput, { ParsedPreferences } from "@/components/PromptInput";
import ConfirmModal from "@/components/ConfirmModal";
import { useStories, createStoryId } from "@/store/useStories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function Home() {
  const [bubbleState, setBubbleState] = useState<"idle" | "active" | "listening">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "zh">("en");
  const [isBusy, setIsBusy] = useState(false);
  type Stage = "idle" | "search" | "plan" | "tts";
  const [stage, setStage] = useState<Stage>("idle");
  const [stageTick, setStageTick] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1
  const [progressTarget, setProgressTarget] = useState(0);
  const getStageCap = useCallback((s: Stage): number => {
    if (s === "tts") return 0.95; // don't fully fill during TTS
    if (s === "plan") return 0.7;
    if (s === "search") return 0.3;
    return 0;
  }, []);
  const router = useRouter();
  const { setCurrent, updateCurrent, saved } = useStories();

  const handleSubmit = useCallback(async (prefs: ParsedPreferences) => {
    setCurrentLanguage(prefs.language);
    setBubbleState("active");
    setIsBusy(true);
    setProgress(0.05);
    setProgressTarget((t) => Math.max(0.1, t));
    console.log("Event: OpenAI model engaged to generate story structure confirmation");
    try {
      const id = createStoryId(prefs.subject, prefs.language);
      setCurrent({
        id,
        subject: prefs.subject,
        language: prefs.language,
        audienceAge: prefs.audienceAge,
        fictionLevel: prefs.fictionLevel,
        lengthMinutes: prefs.lengthMinutes,
        createdAt: Date.now(),
      });
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      console.log("[Confirm] System Prompt:\n", data.debug_prompt?.system);
      console.log("[Confirm] User Payload:\n", data.debug_prompt?.user);
      // Store findings and outline for next step
      updateCurrent({ findings: data.findings, outline: data.outline });
      setConfirmMessage(data.confirmation_message ?? "");
      setConfirmOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(currentLanguage === "zh" ? "确认失败" : "Confirmation failed");
      setBubbleState("idle");
      setIsBusy(false);
      setStage("idle");
    }
  }, []);

  const onConfirm = useCallback(async () => {
    setConfirmOpen(false);
    console.log("Event: OpenAI model engaged to generate the actual story");
    try {
      // Stages are visual only now (search → plan) based on confirm
      setStage("search");
      setProgressTarget((t) => Math.max(t, 0.18));
      setTimeout(() => setStage("plan"), 1000);
      setTimeout(() => setProgressTarget((t) => Math.max(t, 0.55)), 1000);

      // Story
      const cur3 = useStories.getState().current!;
      const resStory = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: cur3.subject, language: currentLanguage, audienceAge: cur3.audienceAge, fictionLevel: cur3.fictionLevel, lengthMinutes: cur3.lengthMinutes, findings: cur3.findings ?? [], outline: cur3.outline ?? [] }),
      });
      if (!resStory.ok) throw new Error("story");
      const storyJson = await resStory.json();
      console.log("[Story] System Prompt:\n", storyJson.debug_prompt?.system);
      console.log("[Story] User Payload:\n", storyJson.debug_prompt?.user);
      const { text, segments } = storyJson;
      updateCurrent({ text, segments });

      // TTS (optional)
      try {
        console.log("Event: Evenlabs voice model engaged to generate voice-over");
        setStage("tts");
        setProgressTarget((t) => Math.max(t, 0.9));
        // show TTS specific progress copy
        
        const resTts = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: currentLanguage }),
        });
        if (resTts.ok) {
          const blob = await resTts.blob();
          const url = URL.createObjectURL(blob);
          updateCurrent({ audioUrl: url });
          // after audio ready, smoothly fill to 100%
          setProgressTarget(1.0);
        }
      } catch {}

      setBubbleState("idle");
      setIsBusy(false);
      setStage("idle");
      setProgress(0);
      setProgressTarget(0);
      router.push("/story");
    } catch (e: any) {
      console.error(e);
      const step = e?.message;
      const msg = step === "research" ? (currentLanguage === "zh" ? "搜集资料失败" : "Research failed")
        : step === "structure" ? (currentLanguage === "zh" ? "生成大纲失败" : "Structure failed")
        : step === "story" ? (currentLanguage === "zh" ? "生成故事失败" : "Story generation failed")
        : (currentLanguage === "zh" ? "出错了" : "Something went wrong");
      toast.error(msg);
      setBubbleState("idle");
      setIsBusy(false);
      setStage("idle");
      setProgress(0);
      setProgressTarget(0);
    }
  }, [currentLanguage, router, updateCurrent]);

  const onCancel = useCallback(() => {
    setConfirmOpen(false);
    setBubbleState("idle");
    setIsBusy(false);
  }, []);

  const stageText = useMemo(() => {
    const en = {
      search: [
        "Searching for related information…",
        "Scanning sources…",
        "Gathering key facts…",
        "Finding reliable references…",
        "Collecting background context…",
      ],
      plan: [
        "Planning the story…",
        "Outlining scenes…",
        "Weaving arcs…",
        "Balancing facts and fun…",
        "Sequencing beats and transitions…",
      ],
      tts: [
        "Generating voice-over…",
        "Shaping narration…",
        "Polishing audio…",
        "Selecting voice phrasing…",
        "Leveling volume and pace…",
      ],
    } as const;
    const zh = {
      search: [
        "正在查找相关资料…",
        "正在浏览来源…",
        "收集关键信息…",
        "查找可靠参考…",
        "整理背景脉络…",
      ],
      plan: [
        "规划故事结构…",
        "梳理场景大纲…",
        "编织故事线…",
        "平衡知识与趣味…",
        "安排节奏与转场…",
      ],
      tts: [
        "正在生成配音…",
        "优化旁白语气…",
        "润色音频细节…",
        "选择合适语气…",
        "调整音量与语速…",
      ],
    } as const;
    const tables = currentLanguage === "zh" ? zh : en;
    if (stage === "search") return tables.search[Math.min(stageTick, tables.search.length - 1)];
    if (stage === "plan") return tables.plan[Math.min(stageTick, tables.plan.length - 1)];
    if (stage === "tts") return tables.tts[Math.min(stageTick, tables.tts.length - 1)];
    return undefined;
  }, [stage, stageTick, currentLanguage]);

  useEffect(() => {
    setStageTick(0);
    if (stage === "idle") return;
    const id = setInterval(() => setStageTick((x) => x + 1), 3000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (!isBusy) return;
    let raf = 0;
    const tick = () => {
      setProgress((p) => {
        const target = Math.max(0, Math.min(1, progressTarget));
        const delta = (target - p) * 0.05; // slower easing for smoother motion
        let next = p + delta;
        // Avoid tiny oscillations
        if (Math.abs(target - next) < 0.001) next = target;
        return Math.max(0, Math.min(1, next));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBusy, progressTarget]);

  // Artificial gradual target increase towards a per-stage cap
  useEffect(() => {
    if (!isBusy || stage === "idle") return;
    const cap = getStageCap(stage);
    const id = setInterval(() => {
      setProgressTarget((t) => {
        const next = Math.min(cap, t + 0.004); // slower creep towards cap
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [isBusy, stage, getStageCap]);

  return (
    <div className="min-h-screen items-center justify-center gap-10 p-8 grid">
      <main className="flex flex-col items-center gap-6">
        <BreathingBubble
          state={bubbleState}
          overlayText={stageText}
          progress={progress}
        />
        {isBusy && (<div className="text-sm text-black/60 dark:text-white/60 text-center min-h-[1.5rem]" />)}
        <PromptInput onSubmit={handleSubmit} disabled={isBusy} language={currentLanguage} />
       
        {saved.length > 0 && (
          <div className="mt-8 w-full max-w-xl">
            <div className="text-[11px] tracking-wide uppercase text-black/50 dark:text-white/50 mb-2">{currentLanguage === "zh" ? "已保存的故事" : "Saved stories"}</div>
            <ul className="space-y-2">
              {saved.map((s) => (
                <li
                  key={s.id}
                  onClick={() => { setCurrent(s); router.push("/story"); }}
                  className="p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="text-sm">{s.subject}</span>
                  <button
                    aria-label={currentLanguage === "zh" ? "删除" : "Delete"}
                    onClick={(e) => { e.stopPropagation(); useStories.getState().remove(s.id); }}
                    className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <ConfirmModal
        open={confirmOpen}
        message={confirmMessage}
        onConfirm={onConfirm}
        onCancel={onCancel}
        language={currentLanguage}
      />
    </div>
  );
}
