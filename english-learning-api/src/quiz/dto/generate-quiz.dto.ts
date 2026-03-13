import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQuizDto {
  @ApiProperty({ example: 'uuid-of-video', description: '영상 ID' })
  @IsUUID()
  videoId: string;
}
