import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { ImportVideoDto } from './dto/import-video.dto';
import { SearchVideoDto } from './dto/search-video.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '추천 영상 목록' })
  @ApiResponse({ status: 200, description: '추천 영상 반환' })
  async findRecommended(@Query('profileId', ParseUUIDPipe) profileId: string) {
    return this.videosService.findRecommended(profileId);
  }

  @Get('search')
  @ApiOperation({ summary: '영상 검색' })
  @ApiResponse({ status: 200, description: '검색 결과 반환' })
  async search(@Query() searchDto: SearchVideoDto) {
    return this.videosService.findAll(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '영상 상세 조회' })
  @ApiResponse({ status: 200, description: '영상 정보 반환' })
  @ApiResponse({ status: 404, description: '영상 없음' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.videosService.findOne(id);
  }

  @Get(':id/subtitles')
  @ApiOperation({ summary: '영상 자막 조회' })
  @ApiResponse({ status: 200, description: '자막 목록 반환' })
  @ApiResponse({ status: 404, description: '영상 없음' })
  async getSubtitles(@Param('id', ParseUUIDPipe) id: string) {
    return this.videosService.getSubtitles(id);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'YouTube 영상 가져오기' })
  @ApiResponse({ status: 201, description: '영상 가져오기 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 URL' })
  async importVideo(@Body() dto: ImportVideoDto) {
    return this.videosService.importVideo(dto.youtubeUrl);
  }
}
