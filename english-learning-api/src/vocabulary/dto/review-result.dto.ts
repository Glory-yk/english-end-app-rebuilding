import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewResultDto {
  @ApiProperty({
    example: 4,
    description: '복습 품질 (0: 완전 까먹음 ~ 5: 완벽)',
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  quality: number;
}
