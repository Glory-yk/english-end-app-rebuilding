import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';
import { YouTubeService } from './youtube.service';
import { AuthService } from '@/auth/auth.service';

@ApiTags('YouTube')
@Controller('youtube')
export class YouTubeController {
  constructor(
    private readonly youtubeService: YouTubeService,
    private readonly authService: AuthService,
  ) {}

  @Get('captions/:videoId')
  @ApiOperation({ summary: 'YouTube 영상 자막 가져오기' })
  async getCaptions(
    @Param('videoId') videoId: string,
    @Query('lang') lang?: string,
  ) {
    const captions = await this.youtubeService.getCaptions(videoId, lang || 'en');
    return {
      videoId,
      lang: lang || 'en',
      captions: captions.map((c, i) => ({
        id: String(i + 1),
        startMs: Math.round(c.start * 1000),
        endMs: Math.round((c.start + c.dur) * 1000),
        text: c.text,
      })),
    };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 채널 최신 영상' })
  async getSubscriptionVideos(
    @CurrentUser() user: User,
    @Query('pageToken') pageToken?: string,
  ) {
    if (!user.google_access_token) {
      return { videos: [], nextPageToken: null };
    }

    return this.youtubeService.getSubscriptionVideos(
      user.google_access_token,
      pageToken,
      async () => this.authService.refreshGoogleToken(user.id),
    );
  }

  @Get('liked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '좋아요 한 영상' })
  async getLikedVideos(
    @CurrentUser() user: User,
    @Query('pageToken') pageToken?: string,
  ) {
    if (!user.google_access_token) {
      return { videos: [], nextPageToken: null };
    }

    return this.youtubeService.getLikedVideos(
      user.google_access_token,
      pageToken,
      async () => this.authService.refreshGoogleToken(user.id),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'YouTube 영상 검색' })
  async searchVideos(
    @Query('q') query: string,
    @Query('pageToken') pageToken?: string,
  ) {
    if (!query?.trim()) {
      return { videos: [], nextPageToken: null };
    }

    const { results, nextPageToken: npt } = await this.youtubeService.searchVideos(query.trim(), 12, pageToken);
    return {
      videos: results.map((r) => ({
        id: r.videoId,
        youtubeId: r.videoId,
        title: r.title,
        channelName: r.channelName,
        thumbnailUrl: r.thumbnailUrl,
        description: '',
        publishedAt: r.publishedAt,
      })),
      nextPageToken: npt,
    };
  }
}
