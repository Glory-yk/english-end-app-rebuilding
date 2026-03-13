import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 등록된 이메일' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@CurrentUser() user: User, @Body() _dto: LoginDto) {
    return this.authService.login(user);
  }

  @Post('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '소셜 로그인' })
  @ApiResponse({ status: 200, description: '소셜 로그인 성공' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Step 1: Redirect to Google OAuth consent screen
   * The mobile app opens this URL via WebBrowser.openAuthSessionAsync
   */
  @Get('google')
  @ApiOperation({ summary: 'Google OAuth 시작 (리디렉트)' })
  async googleAuth(
    @Query('redirect') appRedirect: string,
    @Res() res: Response,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    const serverBaseUrl = this.configService.get<string>('SERVER_BASE_URL', `http://localhost:3000`);

    // The callback comes back to our server first
    const callbackUrl = `${serverBaseUrl}/api/v1/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid profile email https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: appRedirect, // Pass the app's redirect URI in state
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    this.logger.log(`Redirecting to Google OAuth, callback: ${callbackUrl}`);
    res.redirect(googleAuthUrl);
  }

  /**
   * Step 2: Google redirects back here with auth code
   * We exchange it for tokens and redirect back to the mobile app
   */
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth 콜백' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') appRedirect: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      this.logger.error(`Google auth error from query: ${error}`);
      const fallbackUrl = 'http://localhost:8081/auth-callback';
      const redirectBase = appRedirect || fallbackUrl;
      const errorMsg = encodeURIComponent(error || 'Google 인증이 취소되었습니다');
      res.redirect(`${redirectBase}?error=${errorMsg}`);
      return;
    }

    try {
      this.logger.log(`Handling Google Auth Code for redirect: ${appRedirect}`);
      const result = await this.authService.handleGoogleAuthCode(code);

      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.user.id,
        email: result.user.email || '',
        name: result.user.name || '',
        hasYouTubeAccess: String(result.user.hasYouTubeAccess),
      });

      const fallbackUrl = 'http://localhost:8081/auth-callback';
      const redirectBase = appRedirect || fallbackUrl;
      const finalUrl = `${redirectBase}?${params.toString()}`;
      
      this.logger.log(`Redirecting to: ${finalUrl}`);
      res.redirect(finalUrl);
    } catch (e: any) {
      this.logger.error(`Google callback error: ${e.message}`);
      const fallbackUrl = 'http://localhost:8081/auth-callback';
      const redirectBase = appRedirect || fallbackUrl;
      const errorMsg = encodeURIComponent('Google 로그인에 실패했습니다');
      res.redirect(`${redirectBase}?error=${errorMsg}`);
    }
  }
}
