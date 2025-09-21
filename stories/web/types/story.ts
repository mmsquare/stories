export type LanguageCode = "en" | "zh";

export type CategoryFinding = { category: string; highlights: string[] };
export type Findings = { subject: string; categories: CategoryFinding[] };

export type Story = {
  id: string;
  subject: string;
  language: LanguageCode;
  audienceAge?: string;
  fictionLevel?: string;
  lengthMinutes?: number;
  structure?: string; // legacy
  outline?: string[]; // legacy
  findings?: Findings; // categorized findings from confirm step
  text?: string;
  segments?: string[];
  audioUrl?: string; // May be a blob: URL, regenerate on load if missing
  createdAt: number;
};


