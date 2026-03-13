import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Video } from './entities/video.entity';
import { Subtitle } from './entities/subtitle.entity';
import { Vocabulary } from '../vocabulary/entities/vocabulary.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { ExternalModule } from '../external/external.module';
import { SubtitleProcessor } from './processors/subtitle.processor';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, Subtitle, Vocabulary, Profile]),
    BullModule.registerQueue({ name: 'subtitle' }),
    ExternalModule,
  ],
  providers: [SubtitleProcessor, VideosService],
  controllers: [VideosController],
  exports: [TypeOrmModule, BullModule, VideosService],
})
export class VideosModule {}
