"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";

export type ParsedPreferences = {
  subject: string;
  audienceAge?: string;
  fictionLevel?: string;
  lengthMinutes?: number;
  language: "en" | "zh";
};

type PromptInputProps = {
  onSubmit: (prefs: ParsedPreferences) => void;
  disabled?: boolean;
  language?: "en" | "zh";
};

export default function PromptInput({ onSubmit, disabled, language = "en" }: PromptInputProps) {
  const [value, setValue] = useState("");

  const detectLanguage = useCallback((text: string): "en" | "zh" => {
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    return hasChinese ? "zh" : "en";
  }, []);

  const parsePreferences = useCallback(
    (text: string): ParsedPreferences => {
      const language = detectLanguage(text);
      const lengthMinutes = 5;
      const audienceAgeMatch = text.match(/(age|ages?)\s*(\d+\s*-?\s*\d*|\d\+?)/i);
      const audienceAge = audienceAgeMatch?.[2]?.trim();
      const fictionMatch = text.match(/(fiction|fantasy|facts?)\s*(high|low|more|less)/i);
      const fictionLevel = fictionMatch?.[2]?.toLowerCase();
      const subject = text.trim();

      return { subject, audienceAge, fictionLevel, lengthMinutes, language };
    },
    [detectLanguage]
  );

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    const prefs = parsePreferences(value);
    console.log("Event: User input", { input: value, prefs });
    onSubmit(prefs);
  }, [value, parsePreferences, onSubmit]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className={`flex items-center gap-2 rounded-2xl border border-black/5 dark:border-white/10 backdrop-blur px-3 py-2 shadow-sm ${
        disabled ? "bg-black/5 dark:bg-white/5 opacity-50 cursor-not-allowed" : "bg-white/70 dark:bg-white/10"
      }`}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a subject"
          className="flex-1 bg-transparent outline-none placeholder-black/40 dark:placeholder-white/40 text-base"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          aria-label="Send"
          className={`p-2 rounded-full ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
          disabled={disabled}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}


