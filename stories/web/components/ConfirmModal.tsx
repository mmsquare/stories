"use client";

import { useEffect } from "react";

type ConfirmModalProps = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  language: "en" | "zh";
};

export default function ConfirmModal({ open, message, onConfirm, onCancel, language }: ConfirmModalProps) {
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
        <div className="text-sm leading-relaxed mb-6 whitespace-pre-wrap">
          {message}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10"
          >
            {language === "zh" ? "取消" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow"
          >
            {language === "zh" ? "确认" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}


