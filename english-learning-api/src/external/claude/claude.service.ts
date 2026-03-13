import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SubtitleAnalysisResult,
  QuizGenerationResult,
} from './claude.types';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('CLAUDE_API_KEY', '');
    this.model = this.configService.get<string>(
      'CLAUDE_MODEL',
      'claude-sonnet-4-20250514',
    );
  }

  async analyzeSubtitles(
    subtitleTexts: string[],
  ): Promise<SubtitleAnalysisResult> {
    const prompt = `You are an English language analysis assistant for Korean learners.
Analyze the following English subtitle sentences. For each sentence, provide:
1. Difficulty level (1-5, where 1=beginner, 5=advanced)
2. Grammar point (if notable)
3. Word-by-word analysis with: part of speech, phonetic (IPA), Korean meaning, example sentence in English and Korean, difficulty level

Subtitles to analyze:
${subtitleTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Respond in strict JSON format:
{
  "sentences": [
    {
      "text": "original sentence",
      "difficulty": 2,
      "grammarPoint": "present simple",
      "words": [
        {
          "word": "hello",
          "pos": "interjection",
          "phonetic": "/həˈloʊ/",
          "meaningKo": "안녕하세요",
          "exampleEn": "Hello, how are you?",
          "exampleKo": "안녕하세요, 어떠세요?",
          "difficulty": 1
        }
      ]
    }
  ],
  "averageDifficulty": 2.0
}`;

    const responseText = await this.callClaudeAPI(prompt);
    return this.parseJsonResponse<SubtitleAnalysisResult>(responseText);
  }

  async generateQuiz(
    subtitleText: string,
    words: string[],
    ageGroup: string,
    level: string,
  ): Promise<QuizGenerationResult> {
    const prompt = `You are a quiz generator for a Korean English learning app.
Generate quizzes based on the following context:

Age group: ${ageGroup}
Level: ${level}
Subtitle text: "${subtitleText}"
Key words: ${words.join(', ')}

Generate 5-8 quizzes of mixed types:
- fill_blank: Fill in the blank sentence completion
- listening: Choose the correct word/phrase heard
- arrange: Arrange words in correct order
- match: Match English words with Korean meanings

Adjust difficulty based on the level (beginner=1-2, intermediate=2-3, advanced=3-5).
${ageGroup !== 'adult' ? `This is for a child (age group: ${ageGroup}), so keep sentences simple and fun.` : ''}

Respond in strict JSON format:
{
  "quizzes": [
    {
      "type": "fill_blank",
      "prompt": "I ___ to school every day.",
      "options": ["go", "goes", "going", "went"],
      "answer": "go",
      "hint": "현재 시제, 1인칭",
      "difficulty": 1
    }
  ]
}`;

    const responseText = await this.callClaudeAPI(prompt);
    return this.parseJsonResponse<QuizGenerationResult>(responseText);
  }

  private async callClaudeAPI(prompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            this.apiUrl,
            {
              model: this.model,
              max_tokens: 4096,
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            },
            {
              headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              timeout: 60000, // 60 second timeout
            },
          ),
        );

        const content = response.data?.content;
        if (!content || !Array.isArray(content) || content.length === 0) {
          throw new Error('Empty response from Claude API');
        }

        // Extract text from the first text block
        const textBlock = content.find((block: any) => block.type === 'text');
        if (!textBlock) {
          throw new Error('No text block in Claude API response');
        }

        return textBlock.text;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;

        // Retry on timeout, rate limit, or server errors
        if (
          status === 429 ||
          status === 529 ||
          status >= 500 ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT'
        ) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.warn(
            `Claude API attempt ${attempt}/${maxRetries} failed (status: ${status}), retrying in ${backoffMs}ms...`,
          );
          await this.sleep(backoffMs);
          continue;
        }

        // Non-retryable error
        this.logger.error(`Claude API error: ${error.message}`);
        throw error;
      }
    }

    this.logger.error(
      `Claude API failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
    throw lastError;
  }

  private parseJsonResponse<T>(text: string): T {
    // Try to extract JSON from the response (Claude might wrap it in markdown code blocks)
    let jsonStr = text.trim();

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      this.logger.error(`Failed to parse Claude response as JSON: ${text}`);
      throw new Error(`Invalid JSON response from Claude: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
