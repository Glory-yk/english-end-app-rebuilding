import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class SearchVideoDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'peppa pig', description: '검색 키워드' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'cartoon', description: '카테고리' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'beginner',
    description: '난이도',
    enum: ['beginner', 'elementary', 'intermediate', 'advanced'],
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ example: '6', description: '대상 연령 그룹' })
  @IsOptional()
  @IsString()
  ageGroup?: string;
}
