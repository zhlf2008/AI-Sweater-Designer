export interface Category {
  id: string;
  label: string;
  items: string[];
}

export interface Config {
  categories: Category[];
}

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  imageUrl: string | null;
  seed: number;
}

export type Resolution = "1024x1024" | "864x1152" | "1152x864";

export interface AppState {
  prompt: string;
  selectedResolution: Resolution;
  seedInput: string;
  isRandomSeed: boolean;
  selections: Record<string, string>; // categoryId -> selectedItem
}