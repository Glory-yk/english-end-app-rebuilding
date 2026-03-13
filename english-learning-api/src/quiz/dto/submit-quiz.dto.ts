import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitQuizDto {
  @ApiProperty({ example: 'user answer text', description: '사용자 답변' })
  @IsString()
  answer: string;
}
