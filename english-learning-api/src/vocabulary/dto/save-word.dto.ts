import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveWordDto {
  @ApiProperty({ example: 'uuid-of-vocabulary', description: '단어 ID' })
  @IsUUID()
  vocabularyId: string;

  @ApiPropertyOptional({ example: 'uuid-of-video', description: '출처 영상 ID' })
  @IsOptional()
  @IsUUID()
  sourceVideoId?: string;
}
