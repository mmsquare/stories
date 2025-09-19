export type LanguageCode = "en" | "zh";

export type Story = {
  id: string;
  subject: string;
  language: LanguageCode;
  audienceAge?: string;
  fictionLevel?: string;
  lengthMinutes?: number;
  structure?: string; // legacy
  outline?: string[]; // consolidated flow
  findings?: string[]; // consolidated flow
  text?: string;
  segments?: string[];
  audioUrl?: string; // May be a blob: URL, regenerate on load if missing
  createdAt: number;
};


