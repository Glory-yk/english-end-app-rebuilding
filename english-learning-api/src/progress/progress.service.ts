import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LearningSession } from './entities/learning-session.entity';
import { Profile } from '@/profiles/entities/profile.entity';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async createSession(
    profileId: string,
    dto: CreateSessionDto,
  ): Promise<LearningSession> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }

    const session = this.sessionRepository.create({
      profile_id: profileId,
      video_id: dto.videoId || null,
      watched_sec: dto.watchedSec,
      words_learned: dto.wordsLearned,
      quiz_score: dto.quizScore ?? null,
      completed: dto.completed,
    });

    return this.sessionRepository.save(session);
  }

  async getDashboard(profileId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }

    // Total stats
    const sessions = await this.sessionRepository.find({
      where: { profile_id: profileId },
      order: { created_at: 'DESC' },
    });

    const totalWatchedSec = sessions.reduce(
      (sum, s) => sum + (s.watched_sec || 0),
      0,
    );
    const totalWordsLearned = sessions.reduce(
      (sum, s) => sum + s.words_learned,
      0,
    );
    const completedSessions = sessions.filter((s) => s.completed).length;

    const avgQuizScore =
      sessions.filter((s) => s.quiz_score !== null).length > 0
        ? sessions
            .filter((s) => s.quiz_score !== null)
            .reduce((sum, s) => sum + (s.quiz_score || 0), 0) /
          sessions.filter((s) => s.quiz_score !== null).length
        : null;

    // Calculate streak
    const streak = await this.calculateStreak(profileId);

    // Today's progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = sessions.filter(
      (s) => s.created_at >= today && s.created_at < tomorrow,
    );
    const todayMinutes = Math.round(
      todaySessions.reduce((sum, s) => sum + (s.watched_sec || 0), 0) / 60,
    );

    return {
      streak,
      totalWatchedMin: Math.round(totalWatchedSec / 60),
      totalWordsLearned,
      completedSessions,
      avgQuizScore: avgQuizScore ? Math.round(avgQuizScore * 10) / 10 : null,
      todayMinutes,
      dailyGoalMin: profile.daily_goal_min,
      dailyGoalMet: todayMinutes >= profile.daily_goal_min,
    };
  }

  async getFamilyProgress(userId: string) {
    const profiles = await this.profileRepository.find({
      where: { user_id: userId },
    });

    const familyProgress = await Promise.all(
      profiles.map(async (profile) => {
        const dashboard = await this.getDashboard(profile.id);
        return {
          profileId: profile.id,
          profileName: profile.name,
          profileType: profile.type,
          ...dashboard,
        };
      }),
    );

    return familyProgress;
  }

  private async calculateStreak(profileId: string): Promise<number> {
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // Check if today has sessions; if not, start from yesterday
    const todayEnd = new Date(checkDate);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todaySessions = await this.sessionRepository.count({
      where: {
        profile_id: profileId,
        created_at: Between(checkDate, todayEnd),
      },
    });

    if (todaySessions === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days with sessions
    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await this.sessionRepository.count({
        where: {
          profile_id: profileId,
          created_at: Between(dayStart, dayEnd),
        },
      });

      if (count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Safety limit to avoid infinite loops
      if (streak > 365) break;
    }

    return streak;
  }
}
