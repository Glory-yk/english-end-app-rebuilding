import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Quiz } from './entities/quiz.entity';
import { Subtitle } from '../videos/entities/subtitle.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Video } from '../videos/entities/video.entity';
import { ExternalModule } from '../external/external.module';
import { QuizGeneratorProcessor } from './processors/quiz-generator.processor';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, Subtitle, Profile, Video]),
    BullModule.registerQueue({ name: 'quiz' }),
    ExternalModule,
  ],
  providers: [QuizGeneratorProcessor, QuizService],
  controllers: [QuizController],
  exports: [TypeOrmModule, BullModule, QuizService],
})
export class QuizModule {}
