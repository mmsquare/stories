"use client";

import { useEffect, useState } from "react";

type ConfirmModalProps = {
  open: boolean;
  message: string;
  categories?: { category: string; items?: { title: string; yearOrEra?: string; place?: string; personOrProtagonist?: string; oneLineWhyRelevant?: string }[]; highlights?: string[] }[];
  defaultCategory?: string;
  onConfirm: (selection?: { category: string; age: number; lengthMinutes: number; chosenItem?: { title: string; yearOrEra?: string; place?: string; personOrProtagonist?: string } }) => void;
  onCancel: () => void;
  language: "en" | "zh";
};

export default function ConfirmModal({ open, message, categories = [], defaultCategory, onConfirm, onCancel, language }: ConfirmModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || categories[0]?.category || "");
  const [age, setAge] = useState<number>(8);
  const [lengthMinutes, setLengthMinutes] = useState<number>(3);
  const selectedItems = (categories.find((x) => x.category === selectedCategory)?.items) || [];
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  
  useEffect(() => {
    setSelectedCategory(defaultCategory || categories[0]?.category || "");
  }, [defaultCategory, categories]);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "y") onConfirm();
      if (e.key.toLowerCase() === "n") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-[min(92vw,560px)] rounded-3xl p-6 bg-white text-black shadow-2xl border border-black/5">
        <div className="text-lg font-semibold mb-2">
          {language === "zh" ? "请确认" : "Please confirm"}
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </div>
        {categories.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium mb-2">{language === "zh" ? "选择故事类别" : "Select a category"}</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setSelectedCategory(c.category)}
                  className={`px-3 py-1.5 rounded-xl text-sm border ${selectedCategory === c.category ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-black border-black/15"}`}
                >
                  {c.category}
                </button>
              ))}
            </div>
            {!!selectedCategory && selectedItems.length > 0 && (
              <div className="mt-3 text-xs text-black/80 grid gap-1">
                {selectedItems.map((it, i) => (
                  <label key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${selectedItemIdx === i ? 'border-indigo-400 bg-indigo-50' : 'border-black/10'}`}>
                    <input type="radio" name="story-item" checked={selectedItemIdx === i} onChange={() => setSelectedItemIdx(i)} />
                    <div>
                      <div className="font-medium">{it.title}</div>
                      <div className="opacity-70">{[it.personOrProtagonist, it.place, it.yearOrEra].filter(Boolean).join(" • ")}</div>
                      {!!it.oneLineWhyRelevant && (<div className="opacity-70">{it.oneLineWhyRelevant}</div>)}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {!!selectedCategory && selectedItems.length === 0 && (
              <div className="mt-3 text-xs text-black/70">
                {(categories.find((x) => x.category === selectedCategory)?.highlights || []).slice(0, 3).map((h, i) => (
                  <div key={i}>• {h}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{language === "zh" ? "年龄" : "Age"}</span>
              <span>{age}+ {language === "zh" ? "岁" : "years"}</span>
            </div>
            <input type="range" min={4} max={21} value={age} onChange={(e) => setAge(parseInt(e.target.value, 10))} className="w-full" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{language === "zh" ? "时长" : "Length"}</span>
              <span>{lengthMinutes} {language === "zh" ? "分钟" : "min"}</span>
            </div>
            <input type="range" min={2} max={10} value={lengthMinutes} onChange={(e) => setLengthMinutes(parseInt(e.target.value, 10))} className="w-full" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10"
          >
            {language === "zh" ? "取消" : "Cancel"}
          </button>
          <button
            onClick={() => onConfirm({ category: selectedCategory || categories[0]?.category || "", age, lengthMinutes, chosenItem: selectedItems[selectedItemIdx] })}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow"
          >
            {language === "zh" ? "确认" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}


