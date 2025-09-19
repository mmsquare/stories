import type { LanguageCode } from "@/types/story";

const translations = {
  en: {
    inputPlaceholder: "What stories you want to hear today?",
    ctaBelow: "What stories you want to hear today?",
    savedStories: "Saved stories",
    open: "Open",
    back: "Back",
    save: "Save",
    play: "Play",
    pause: "Pause",
  },
  zh: {
    inputPlaceholder: "你今天想听什么故事？",
    ctaBelow: "你今天想听什么故事？",
    savedStories: "已保存的故事",
    open: "打开",
    back: "返回",
    save: "保存",
    play: "播放",
    pause: "暂停",
  },
} as const;

export function t(lang: LanguageCode, key: keyof typeof translations.en) {
  const table = translations[lang] || translations.en;
  return table[key];
}


