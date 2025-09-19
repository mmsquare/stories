"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Story, LanguageCode } from "@/types/story";

type StoriesState = {
  current?: Story;
  saved: Story[];
  setCurrent: (s: Story | undefined) => void;
  saveCurrent: () => void;
  remove: (id: string) => void;
  updateCurrent: (partial: Partial<Story>) => void;
};

export const useStories = create<StoriesState>()(
  persist(
    (set, get) => ({
      current: undefined,
      saved: [],
      setCurrent: (s) => set({ current: s }),
      updateCurrent: (partial) => set({ current: { ...get().current!, ...partial } }),
      saveCurrent: () => {
        const cur = get().current;
        if (!cur) return;
        set({ saved: [cur, ...get().saved.filter((x) => x.id !== cur.id)] });
        console.log("Event: Story saved", { id: cur.id, subject: cur.subject });
      },
      remove: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
    }),
    { name: "stories-store" }
  )
);

export function createStoryId(subject: string, language: LanguageCode) {
  const base = subject.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${language}-${base}-${Date.now()}`;
}


