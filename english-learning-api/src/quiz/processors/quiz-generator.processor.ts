import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Subtitle } from '../../videos/entities/subtitle.entity';
import { Profile } from '../../profiles/entities/profile.entity';
import { ClaudeService } from '../../external/claude/claude.service';

@Processor('quiz')
export class QuizGeneratorProcessor {
  private readonly logger = new Logger(QuizGeneratorProcessor.name);

  constructor(
    @InjectRepository(Quiz) private quizRepo: Repository<Quiz>,
    @InjectRepository(Subtitle) private subtitleRepo: Repository<Subtitle>,
    @InjectRepository(Profile) private profileRepo: Repository<Profile>,
    private claudeService: ClaudeService,
  ) {}

  @Process('generate')
  async generateQuiz(job: Job<{ videoId: string; profileId: string }>) {
    const { videoId, profileId } = job.data;
    this.logger.log(
      `Generating quiz for video: ${videoId}, profile: ${profileId}`,
    );

    // Get subtitles
    const subtitles = await this.subtitleRepo.find({
      where: { video: { id: videoId } },
      order: { start_ms: 'ASC' },
    });

    if (!subtitles.length) {
      return { success: false, reason: 'no_subtitles' };
    }

    // Get profile for age/level
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
    });
    if (!profile) {
      return { success: false, reason: 'profile_not_found' };
    }

    await job.progress(30);

    // Extract text and words
    const subtitleText = subtitles.map((s) => s.text).join('\n');
    const words = subtitles
      .flatMap((s) => (s.words_json || []).map((w: any) => w.word))
      .filter(Boolean);

    // Generate quiz via Claude
    const result = await this.claudeService.generateQuiz(
      subtitleText,
      words,
      profile.age_group || 'adult',
      profile.level || 'beginner',
    );

    await job.progress(70);

    // Save quizzes
    const quizEntities = result.quizzes.map((q) => {
      const quiz = new Quiz();
      quiz.video = { id: videoId } as any;
      quiz.profile = { id: profileId } as any;
      quiz.type = q.type;
      quiz.question = {
        prompt: q.prompt,
        options: q.options,
        answer: q.answer,
        hint: q.hint,
      };
      quiz.difficulty = q.difficulty;
      return quiz;
    });

    await this.quizRepo.save(quizEntities);

    await job.progress(100);
    this.logger.log(
      `Generated ${quizEntities.length} quizzes for video: ${videoId}`,
    );
    return { success: true, quizCount: quizEntities.length };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Quiz generation job ${job.id} failed: ${error.message}`,
      error.stack,
    );
  }
}
