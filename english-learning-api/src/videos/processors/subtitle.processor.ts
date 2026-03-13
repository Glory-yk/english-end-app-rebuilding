import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subtitle } from '../entities/subtitle.entity';
import { Video } from '../entities/video.entity';
import { Vocabulary } from '../../vocabulary/entities/vocabulary.entity';
import { YouTubeService } from '../../external/youtube/youtube.service';
import { ClaudeService } from '../../external/claude/claude.service';

@Processor('subtitle')
export class SubtitleProcessor {
  private readonly logger = new Logger(SubtitleProcessor.name);

  constructor(
    @InjectRepository(Subtitle) private subtitleRepo: Repository<Subtitle>,
    @InjectRepository(Video) private videoRepo: Repository<Video>,
    @InjectRepository(Vocabulary) private vocabRepo: Repository<Vocabulary>,
    private youtubeService: YouTubeService,
    private claudeService: ClaudeService,
  ) {}

  @Process('parse')
  async parseSubtitles(job: Job<{ videoId: string; youtubeId: string }>) {
    this.logger.log(`Processing subtitles for video: ${job.data.youtubeId}`);

    // Step 1: Extract captions from YouTube
    const captions = await this.youtubeService.getCaptions(job.data.youtubeId);
    if (!captions || captions.length === 0) {
      this.logger.warn(`No captions found for video: ${job.data.youtubeId}`);
      await this.videoRepo.update(job.data.videoId, { subtitle_lang: null });
      return { success: false, reason: 'no_captions' };
    }

    await job.progress(20);

    // Step 2: Analyze with Claude API
    const subtitleTexts = captions.map((c) => c.text);
    let analyzed;
    try {
      analyzed = await this.claudeService.analyzeSubtitles(subtitleTexts);
    } catch (error) {
      this.logger.error(`Claude analysis failed: ${error.message}`);
      // Fallback: save raw subtitles without analysis
      analyzed = null;
    }

    await job.progress(60);

    // Step 3: Save subtitles to DB
    const subtitleEntities = captions.map((cap, i) => {
      const entity = new Subtitle();
      entity.video = { id: job.data.videoId } as any;
      entity.lang = 'en';
      entity.start_ms = Math.round(cap.start * 1000);
      entity.end_ms = Math.round((cap.start + cap.dur) * 1000);
      entity.text = cap.text;
      entity.words_json = analyzed?.sentences?.[i]?.words || null;
      return entity;
    });

    await this.subtitleRepo.save(subtitleEntities);
    await job.progress(80);

    // Step 4: Upsert vocabulary words
    if (analyzed?.sentences) {
      const allWords = analyzed.sentences.flatMap((s) => s.words);
      for (const word of allWords) {
        await this.vocabRepo.upsert(
          {
            word: word.word.toLowerCase(),
            phonetic: word.phonetic,
            meaning_ko: word.meaningKo,
            pos: word.pos,
            example_en: word.exampleEn,
            example_ko: word.exampleKo,
            difficulty: word.difficulty,
          },
          { conflictPaths: ['word', 'pos'] },
        );
      }
    }

    // Step 5: Update video difficulty
    if (analyzed?.averageDifficulty) {
      const diff = analyzed.averageDifficulty;
      await this.videoRepo.update(job.data.videoId, {
        difficulty: diff <= 2 ? 'easy' : diff <= 3.5 ? 'medium' : 'hard',
        subtitle_lang: 'en',
      });
    }

    await job.progress(100);
    this.logger.log(
      `Completed subtitle processing for: ${job.data.youtubeId}`,
    );
    return { success: true, subtitleCount: captions.length };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}
