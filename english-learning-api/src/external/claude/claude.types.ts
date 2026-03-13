export interface SubtitleAnalysisResult {
  sentences: SentenceAnalysis[];
  averageDifficulty: number;
}

export interface SentenceAnalysis {
  text: string;
  difficulty: number;
  grammarPoint?: string;
  words: WordAnalysisResult[];
}

export interface WordAnalysisResult {
  word: string;
  pos: string;
  phonetic: string;
  meaningKo: string;
  exampleEn?: string;
  exampleKo?: string;
  difficulty: number;
}

export interface QuizGenerationResult {
  quizzes: GeneratedQuiz[];
}

export interface GeneratedQuiz {
  type: 'fill_blank' | 'listening' | 'arrange' | 'match';
  prompt: string;
  options: string[];
  answer: string;
  hint?: string;
  difficulty: number;
}
