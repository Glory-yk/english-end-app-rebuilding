import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { Video } from '@/videos/entities/video.entity';
import { Profile } from '@/profiles/entities/profile.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async generate(profileId: string, videoId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }

    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['subtitles'],
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다');
    }

    // Placeholder for AI-based quiz generation via Bull Queue.
    // In production, this would enqueue a job that calls the Claude API
    // to generate quiz questions from the video's subtitles.
    // For now, create a sample quiz directly.

    const sampleQuiz = this.quizRepository.create({
      video_id: videoId,
      profile_id: profileId,
      type: 'multiple_choice',
      question: {
        prompt: `Sample question for video: ${video.title}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        hint: 'This is a sample hint',
      },
      difficulty: 1,
    });

    const savedQuiz = await this.quizRepository.save(sampleQuiz);

    return {
      message: '퀴즈가 생성되었습니다',
      quizId: savedQuiz.id,
    };
  }

  async submitAnswer(quizId: string, answer: string) {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('퀴즈를 찾을 수 없습니다');
    }

    const isCorrect =
      quiz.question.answer.toLowerCase().trim() ===
      answer.toLowerCase().trim();

    return {
      quizId: quiz.id,
      correct: isCorrect,
      correctAnswer: quiz.question.answer,
      userAnswer: answer,
    };
  }

  async getDailyQuiz(profileId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const quizzes = await this.quizRepository.find({
      where: {
        profile_id: profileId,
        created_at: Between(today, tomorrow),
      },
      relations: ['video'],
      order: { created_at: 'DESC' },
    });

    return quizzes;
  }

  async findByVideo(videoId: string, profileId: string) {
    return this.quizRepository.find({
      where: {
        video_id: videoId,
        profile_id: profileId,
      },
      order: { created_at: 'DESC' },
    });
  }
}
