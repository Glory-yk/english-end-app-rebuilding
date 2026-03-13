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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VocabularyService } from './vocabulary.service';
import { SaveWordDto } from './dto/save-word.dto';
import { ReviewResultDto } from './dto/review-result.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Vocabulary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post('save')
  @ApiOperation({ summary: '단어 저장' })
  @ApiResponse({ status: 201, description: '단어 저장 성공' })
  @ApiResponse({ status: 409, description: '이미 저장된 단어' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async saveWord(
    @Query('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: SaveWordDto,
  ) {
    return this.vocabularyService.saveWord(profileId, dto);
  }

  @Get('review')
  @ApiOperation({ summary: '복습 대상 단어 목록' })
  @ApiResponse({ status: 200, description: '복습 단어 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async getReviewList(
    @Query('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.vocabularyService.getReviewList(profileId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: '복습 결과 제출' })
  @ApiResponse({ status: 200, description: '복습 결과 반영 성공' })
  @ApiResponse({ status: 404, description: '단어 없음' })
  async submitReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewResultDto,
  ) {
    return this.vocabularyService.submitReview(id, dto.quality);
  }

  @Get('stats')
  @ApiOperation({ summary: '단어 학습 통계' })
  @ApiResponse({ status: 200, description: '통계 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async getStats(
    @Query('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.vocabularyService.getStats(profileId);
  }

  @Get()
  @ApiOperation({ summary: '저장한 단어 목록' })
  @ApiResponse({ status: 200, description: '단어 목록 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async getUserWords(
    @Query('profileId', ParseUUIDPipe) profileId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.vocabularyService.getUserWords(profileId, pagination);
  }
}
