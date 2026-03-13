import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningSession } from './entities/learning-session.entity';
import { Profile } from '@/profiles/entities/profile.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LearningSession, Profile])],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [TypeOrmModule, ProgressService],
})
export class ProgressModule {}
