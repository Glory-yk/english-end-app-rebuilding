import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { YouTubeService } from './youtube/youtube.service';
import { YouTubeController } from './youtube/youtube.controller';
import { ClaudeService } from './claude/claude.service';
import { TtsService } from './tts/tts.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [YouTubeController],
  providers: [YouTubeService, ClaudeService, TtsService],
  exports: [YouTubeService, ClaudeService, TtsService],
})
export class ExternalModule {}
