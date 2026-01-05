"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BreathingBubble from "@/components/BreathingBubble";
import PromptInput, { ParsedPreferences } from "@/components/PromptInput";
import SettingsModal from "@/components/SettingsModal";
import { useStories, createStoryId } from "@/store/useStories";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function Home() {
  const [bubbleState, setBubbleState] = useState<"idle" | "active" | "listening">("idle");
  // Confirmation flow removed
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "zh">("en");
  const [isBusy, setIsBusy] = useState(false);
  type Stage = "idle" | "search" | "plan" | "tts";
  const [stage, setStage] = useState<Stage>("idle");
  const [stageTick, setStageTick] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1
  const [progressTarget, setProgressTarget] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategories, setSettingsCategories] = useState<string[]>(["Real", "Historical", "Myth/Legend"]);
  const [settingsAge, setSettingsAge] = useState<number>(21);
  const [settingsLength, setSettingsLength] = useState<number>(5);
  const getStageCap = useCallback((s: Stage): number => {
    if (s === "tts") return 0.95; // don't fully fill during TTS
    if (s === "plan") return 0.7;
    if (s === "search") return 0.3;
    return 0;
  }, []);
  const router = useRouter();
  const { setCurrent, updateCurrent, saved } = useStories();
  const ttsDisabled = process.env.NEXT_PUBLIC_TTS_DISABLED === "true";
  const allCategories = useMemo<string[]>(() => [
    "Real",
    "Historical",
    "Myth/Legend",
    "Scientific",
    "Romantic/Love",
    "Heroic",
  ], []);

  const handleSubmit = useCallback(async (prefs: ParsedPreferences) => {
    setCurrentLanguage(prefs.language);
    setBubbleState("active");
    setIsBusy(true);
    setProgress(0.05);
    setProgressTarget((t) => Math.max(0.1, t));
    console.log("Event: OpenAI model engaged to generate story directly");
    try {
      const id = createStoryId(prefs.subject, prefs.language);
      setCurrent({
        id,
        subject: prefs.subject,
        language: prefs.language,
        lengthMinutes: prefs.lengthMinutes,
        createdAt: Date.now(),
      });

      // Visual stages only
      setStage("search");
      setProgressTarget((t) => Math.max(t, 0.18));
      setTimeout(() => setStage("plan"), 800);
      setTimeout(() => setProgressTarget((t) => Math.max(t, 0.55)), 800);

      const chosenCategory = settingsCategories[0] || "";
      const age = settingsAge;
      const lengthMinutes = settingsLength;
      updateCurrent({ categories: settingsCategories, category: chosenCategory, age, lengthMinutes });

      const requestBody = { subject: prefs.subject, language: prefs.language, categories: settingsCategories, age, lengthMinutes };
      console.log("[OpenAI] Request payload:", requestBody);
      const resStory = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      console.log("[OpenAI] Response status:", resStory.status, resStory.statusText);
      if (!resStory.ok) {
        const errText = await resStory.text();
        console.error("[OpenAI] Error response body:\n", errText);
        throw new Error("story");
      }
      const storyJson = await resStory.json();
      // Frontend logging: exact combined prompt used by the model
      if (storyJson?.debug_prompt?.prompt) {
        console.log("[OpenAI] Model:", storyJson.debug_prompt.model || "(unknown)");
        console.log("[OpenAI] Combined Prompt Sent:\n", storyJson.debug_prompt.prompt);
      }
      // Logging: number of stories and categories
      const variants = Array.isArray(storyJson?.variants) ? storyJson.variants : [];
      console.log(`[OpenAI] Stories returned: ${variants.length}`);
      if (variants.length > 0) {
        const cats = variants.map((v: any) => v?.category || "");
        console.log("[OpenAI] Categories:", cats);
        // Log each story content
        variants.forEach((v: any, i: number) => {
          console.log(`\n[OpenAI] Story #${i + 1} (category=${v?.category ?? ""}, reference=${v?.reference ?? ""})\n`);
          console.log(v?.text ?? "");
        });
      }
      updateCurrent({ text: storyJson.text, segments: storyJson.segments, variants: storyJson.variants, currentVariantIndex: 0 });

      setBubbleState("idle");
      setIsBusy(false);
      setStage("idle");
      setProgress(0);
      setProgressTarget(0);
      router.push("/story");
    } catch (e) {
      console.error(e);
      toast.error(currentLanguage === "zh" ? "生成失败" : "Generation failed");
      setBubbleState("idle");
      setIsBusy(false);
      setStage("idle");
      setProgress(0);
      setProgressTarget(0);
    }
  }, [router, settingsCategories, settingsAge, settingsLength]);

  // Legacy confirm handler removed

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
        <div className="w-full max-w-xl mx-auto flex items-center gap-2">
          <PromptInput onSubmit={handleSubmit} disabled={isBusy} language={currentLanguage} className="flex-1" />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={currentLanguage === "zh" ? "设置" : "Settings"}
            className="p-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 text-black/70 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            disabled={isBusy}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51.61.25 1.31.11 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.45.51-.58 1.21-.33 1.82.25.61.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1Z"/></svg>
          </button>
        </div>
        <div className="w-full max-w-xl mx-auto -mt-1">
          <div className="text-[11px] tracking-wide uppercase text-black/50 dark:text-white/50 mb-1">
            {currentLanguage === "zh" ? "故事类别" : "Story categories"}
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((c) => {
              const selected = settingsCategories.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setSettingsCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`px-3 py-1.5 rounded-xl text-sm border ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/70 dark:bg-white/10 text-black/80 dark:text-white/80 border-black/15 dark:border-white/10"}`}
                  disabled={isBusy}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
       
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

      {/* Confirmation removed */}
      <SettingsModal
        open={settingsOpen}
        language={currentLanguage}
        initialAge={settingsAge}
        initialLength={settingsLength}
        onClose={() => setSettingsOpen(false)}
        onSave={({ age, lengthMinutes }) => {
          setSettingsAge(age);
          setSettingsLength(lengthMinutes);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}
