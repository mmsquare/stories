export type LanguageCode = "en" | "zh";

export type CategoryItem = {
  title: string;
  yearOrEra?: string;
  place?: string;
  personOrProtagonist?: string;
  oneLineWhyRelevant?: string;
};

export type CategoryFinding = {
  category: string;
  items?: CategoryItem[];
  // Back-compat with older shape
  highlights?: string[];
};

export type Findings = { subject: string; categories: CategoryFinding[] };

export type Story = {
  id: string;
  subject: string;
  language: LanguageCode;
  category?: string;
  categories?: string[]; // user-selected preferred categories
  age?: number;
  audienceAge?: string;
  fictionLevel?: string;
  lengthMinutes?: number;
  structure?: string; // legacy
  outline?: string[]; // legacy
  findings?: Findings; // categorized findings from confirm step
  chosenItem?: CategoryItem; // selected real story candidate
  text?: string;
  segments?: string[];
  // Multiple candidate stories returned by OpenAI in a single call
  variants?: { subject?: string; category?: string; text: string; segments: string[]; reference?: string }[];
  currentVariantIndex?: number;
  audioUrl?: string; // May be a blob: URL, regenerate on load if missing
  audioData?: string; // base64-encoded audio for persistence
  audioMime?: string; // e.g., audio/mpeg
  createdAt: number;
};


