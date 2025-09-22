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
  audioUrl?: string; // May be a blob: URL, regenerate on load if missing
  createdAt: number;
};


