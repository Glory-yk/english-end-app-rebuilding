import { IsOptional, IsUUID, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional({ example: 'uuid-of-video', description: '영상 ID' })
  @IsOptional()
  @IsUUID()
  videoId?: string;

  @ApiProperty({ example: 300, description: '시청 시간 (초)' })
  @IsNumber()
  @Min(0)
  watchedSec: number;

  @ApiProperty({ example: 5, description: '학습한 단어 수' })
  @IsNumber()
  @Min(0)
  wordsLearned: number;

  @ApiPropertyOptional({ example: 85.5, description: '퀴즈 점수' })
  @IsOptional()
  @IsNumber()
  quizScore?: number;

  @ApiProperty({ example: false, description: '완료 여부' })
  @IsBoolean()
  completed: boolean;
}
