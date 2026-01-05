"use client";

import { useEffect, useState } from "react";

type SettingsModalProps = {
  open: boolean;
  language: "en" | "zh";
  initialAge?: number;
  initialLength?: number;
  onClose: () => void;
  onSave: (settings: { age: number; lengthMinutes: number }) => void;
};

export default function SettingsModal({ open, language, initialAge = 21, initialLength = 5, onClose, onSave }: SettingsModalProps) {
  const [age, setAge] = useState<number>(initialAge);
  const [lengthMinutes, setLengthMinutes] = useState<number>(initialLength);

  useEffect(() => {
    setAge(initialAge);
    setLengthMinutes(initialLength);
  }, [initialAge, initialLength]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[min(92vw,560px)] rounded-3xl p-6 bg-white text-black shadow-2xl border border-black/5">
        <div className="text-lg font-semibold mb-2">
          {language === "zh" ? "偏好设置" : "Story Preferences"}
        </div>
        <div className="grid gap-4 mt-2">
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
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10">
            {language === "zh" ? "取消" : "Cancel"}
          </button>
          <button onClick={() => onSave({ age, lengthMinutes })} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow">
            {language === "zh" ? "保存" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


