export interface Category {
  id: string;
  label: string;
  items: string[];
}

export type ApiProvider = 'gemini' | 'huggingface';

export interface Config {
  categories: Category[];
  apiProvider: ApiProvider;
  userApiKey: string; // User entered API Key
  // Advanced settings for Z-Image/HF
  steps: number;
  timeShift: number;
}

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  imageUrl: string | null;
  seed: number;
}

export type Resolution = 
  | "1024x1024" | "864x1152" | "1152x864" 
  | "1248x832" | "832x1248" | "1280x720" | "720x1280" | "1344x576" | "576x1344";

export interface AppState {
  prompt: string;
  selectedResolution: Resolution;
  seedInput: string;
  isRandomSeed: boolean;
  selections: Record<string, string>;
}