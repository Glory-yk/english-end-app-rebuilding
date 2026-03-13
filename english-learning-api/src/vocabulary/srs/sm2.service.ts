import { Injectable } from '@nestjs/common';

export interface SM2Input {
  quality: number; // 0-5
  easeFactor: number; // previous EF (default 2.5)
  interval: number; // previous interval in days
  repetitions: number; // previous repetition count
}

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

@Injectable()
export class SM2Service {
  calculate(input: SM2Input): SM2Result {
    const {
      quality,
      easeFactor: prevEF,
      interval: prevInterval,
      repetitions: prevReps,
    } = input;

    // 1. Calculate new ease factor
    let ef =
      prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ef = Math.max(1.3, ef); // Minimum 1.3

    // 2. Calculate interval and repetitions
    let interval: number;
    let repetitions: number;

    if (quality < 3) {
      // Failed - reset
      repetitions = 0;
      interval = 0; // Review immediately (same day)
    } else {
      repetitions = prevReps + 1;
      if (repetitions === 1) {
        interval = 1; // First success: 1 day
      } else if (repetitions === 2) {
        interval = 6; // Second success: 6 days
      } else {
        interval = Math.round(prevInterval * ef);
      }
    }

    // 3. Determine status
    let status: SM2Result['status'];
    if (repetitions === 0) {
      status = 'learning';
    } else if (interval < 21) {
      status = 'review';
    } else {
      status = 'mastered';
    }

    // 4. Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    // Set to start of day for consistency
    nextReview.setHours(0, 0, 0, 0);

    return {
      easeFactor: Math.round(ef * 100) / 100,
      interval,
      repetitions,
      nextReview,
      status,
    };
  }
}
