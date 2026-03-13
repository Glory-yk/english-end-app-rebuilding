export interface WordAnalysis {
  word: string;
  pos: string;
  meaning_ko: string;
  phonetic: string;
  example_en?: string;
  example_ko?: string;
  difficulty?: number;
}
