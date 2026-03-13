import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @ApiOperation({ summary: '퀴즈 생성' })
  @ApiResponse({ status: 201, description: '퀴즈 생성 요청 성공' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async generate(
    @Query('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.quizService.generate(profileId, dto.videoId);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '퀴즈 답변 제출' })
  @ApiResponse({ status: 200, description: '채점 결과 반환' })
  @ApiResponse({ status: 404, description: '퀴즈 없음' })
  async submitAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizService.submitAnswer(id, dto.answer);
  }

  @Get('daily')
  @ApiOperation({ summary: '오늘의 퀴즈 목록' })
  @ApiResponse({ status: 200, description: '오늘의 퀴즈 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async getDailyQuiz(
    @Query('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.quizService.getDailyQuiz(profileId);
  }

  @Get('video/:videoId')
  @ApiOperation({ summary: '영상별 퀴즈 목록' })
  @ApiResponse({ status: 200, description: '영상 퀴즈 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async findByVideo(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Query('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.quizService.findByVideo(videoId, profileId);
  }
}
