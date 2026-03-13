import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ example: 'google', enum: ['google', 'kakao', 'apple'] })
  @IsString()
  @IsIn(['google', 'kakao', 'apple'])
  provider: 'google' | 'kakao' | 'apple';

  @ApiProperty({ example: 'provider-oauth-token' })
  @IsString()
  providerToken: string;

  @ApiPropertyOptional({ example: 'server-auth-code', description: 'Server auth code for offline access (Google)' })
  @IsString()
  @IsOptional()
  serverAuthCode?: string;
}
