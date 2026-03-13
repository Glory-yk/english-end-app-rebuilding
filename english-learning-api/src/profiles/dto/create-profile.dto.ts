import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ example: '아이 이름' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'child', enum: ['child', 'adult'] })
  @IsString()
  @IsIn(['child', 'adult'])
  type: 'child' | 'adult';

  @ApiPropertyOptional({ example: '6', description: '연령 그룹 (1, 3, 6 등)' })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiPropertyOptional({
    example: 'beginner',
    enum: ['beginner', 'elementary', 'intermediate', 'advanced'],
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 20, description: '일일 학습 목표 (분)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  dailyGoalMin?: number;
}
