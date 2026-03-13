export type QuizType = 'multiple_choice' | 'fill_blank' | 'listening' | 'speaking' | 'matching';

export interface Quiz {
  id: string;
  videoId: string;
  type: QuizType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  profileId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  attemptedAt: string;
}

export interface QuizSession {
  id: string;
  profileId: string;
  videoId?: string;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt?: string;
}
