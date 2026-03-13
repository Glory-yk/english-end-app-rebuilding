import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('sessions')
  @ApiOperation({ summary: '학습 세션 기록' })
  @ApiResponse({ status: 201, description: '세션 저장 성공' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async createSession(
    @Query('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.progressService.createSession(profileId, dto);
  }

  @Get('progress/dashboard')
  @ApiOperation({ summary: '학습 대시보드' })
  @ApiResponse({ status: 200, description: '대시보드 데이터 반환' })
  @ApiQuery({ name: 'profileId', type: String, description: '프로필 ID' })
  async getDashboard(
    @Query('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.progressService.getDashboard(profileId);
  }

  @Get('progress/family')
  @ApiOperation({ summary: '가족 학습 현황' })
  @ApiResponse({ status: 200, description: '가족 전체 진행 상황 반환' })
  async getFamilyProgress(@CurrentUser() user: User) {
    return this.progressService.getFamilyProgress(user.id);
  }
}
