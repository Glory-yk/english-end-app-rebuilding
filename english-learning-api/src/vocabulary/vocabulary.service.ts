import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not } from 'typeorm';
import { UserVocabulary } from './entities/user-vocabulary.entity';
import { Vocabulary } from './entities/vocabulary.entity';
import { SaveWordDto } from './dto/save-word.dto';
import { SM2Service } from './srs/sm2.service';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(UserVocabulary)
    private readonly userVocabularyRepository: Repository<UserVocabulary>,
    @InjectRepository(Vocabulary)
    private readonly vocabularyRepository: Repository<Vocabulary>,
    private readonly sm2Service: SM2Service,
  ) {}

  async saveWord(profileId: string, dto: SaveWordDto): Promise<UserVocabulary> {
    const vocabulary = await this.vocabularyRepository.findOne({
      where: { id: dto.vocabularyId },
    });

    if (!vocabulary) {
      throw new NotFoundException('단어를 찾을 수 없습니다');
    }

    const existing = await this.userVocabularyRepository.findOne({
      where: {
        profile_id: profileId,
        vocabulary_id: dto.vocabularyId,
      },
    });

    if (existing) {
      throw new ConflictException('이미 저장된 단어입니다');
    }

    const userVocabulary = this.userVocabularyRepository.create({
      profile_id: profileId,
      vocabulary_id: dto.vocabularyId,
      source_video: dto.sourceVideoId || null,
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      next_review: new Date(),
      status: 'new',
    });

    return this.userVocabularyRepository.save(userVocabulary);
  }

  /**
   * Get list of words due for review.
   * Priority: learning first, then oldest next_review, then lowest ease_factor.
   * Excludes mastered words.
   */
  async getReviewList(
    profileId: string,
    limit = 20,
  ): Promise<UserVocabulary[]> {
    return this.userVocabularyRepository.find({
      where: {
        profile_id: profileId,
        next_review: LessThanOrEqual(new Date()),
        status: Not('mastered'),
      },
      relations: ['vocabulary'],
      order: {
        status: 'ASC', // 'learning' before 'new' and 'review' alphabetically
        next_review: 'ASC',
        ease_factor: 'ASC',
      },
      take: limit,
    });
  }

  /**
   * Submit a review result, delegate SM-2 calculation to SM2Service,
   * and update all SRS fields on the UserVocabulary entity.
   */
  async submitReview(
    userVocabId: string,
    quality: number,
  ): Promise<UserVocabulary> {
    const userVocab = await this.userVocabularyRepository.findOne({
      where: { id: userVocabId },
      relations: ['vocabulary'],
    });

    if (!userVocab) {
      throw new NotFoundException('사용자 단어를 찾을 수 없습니다');
    }

    const result = this.sm2Service.calculate({
      quality,
      easeFactor: userVocab.ease_factor,
      interval: userVocab.interval_days,
      repetitions: userVocab.repetitions,
    });

    userVocab.ease_factor = result.easeFactor;
    userVocab.interval_days = result.interval;
    userVocab.repetitions = result.repetitions;
    userVocab.next_review = result.nextReview;
    userVocab.last_reviewed = new Date();
    userVocab.status = result.status;

    return this.userVocabularyRepository.save(userVocab);
  }

  /**
   * Get vocabulary statistics for a profile, including streak calculation.
   */
  async getStats(profileId: string) {
    const allWords = await this.userVocabularyRepository.find({
      where: { profile_id: profileId },
    });

    const totalWords = allWords.length;
    const mastered = allWords.filter((w) => w.status === 'mastered').length;
    const learning = allWords.filter((w) => w.status === 'learning').length;
    const review = allWords.filter((w) => w.status === 'review').length;
    const newWords = allWords.filter((w) => w.status === 'new').length;

    // Count today's reviews
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayReviewed = allWords.filter(
      (w) => w.last_reviewed && w.last_reviewed >= todayStart,
    ).length;

    // Average ease factor
    const averageEaseFactor =
      totalWords > 0
        ? Math.round(
            (allWords.reduce((sum, w) => sum + w.ease_factor, 0) / totalWords) *
              100,
          ) / 100
        : 2.5;

    // Calculate streak (consecutive days with at least one review)
    const streakDays = this.calculateStreak(allWords);

    return {
      total: totalWords,
      mastered,
      learning,
      review,
      new: newWords,
      todayReviewed,
      averageEaseFactor,
      streakDays,
      dueForReview: allWords.filter(
        (w) => w.next_review <= new Date() && w.status !== 'mastered',
      ).length,
    };
  }

  async getUserWords(profileId: string, pagination: PaginationDto, status?: string) {
    const { page = 1, limit = 20 } = pagination;

    const where: Record<string, unknown> = { profile_id: profileId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.userVocabularyRepository.findAndCount({
      where,
      relations: ['vocabulary'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate consecutive days streak from word review history.
   */
  private calculateStreak(allWords: UserVocabulary[]): number {
    const reviewedDates = new Set<string>();
    for (const w of allWords) {
      if (w.last_reviewed) {
        const dateStr = w.last_reviewed.toISOString().split('T')[0];
        reviewedDates.add(dateStr);
      }
    }

    let streak = 0;
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    while (true) {
      const dateStr = date.toISOString().split('T')[0];
      if (reviewedDates.has(dateStr)) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
