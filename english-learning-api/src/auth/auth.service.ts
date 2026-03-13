import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@/users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      email: dto.email,
      password_hash: passwordHash,
      provider: 'local',
    });

    const savedUser = await this.userRepository.save(user);
    return this.generateTokens(savedUser);
  }

  async login(user: User) {
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user || !user.password_hash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        hasYouTubeAccess: !!user.google_access_token,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('리프레시 토큰이 만료되었거나 유효하지 않습니다');
    }
  }

  async socialLogin(dto: SocialLoginDto) {
    if (!dto.providerToken) {
      throw new BadRequestException('유효하지 않은 소셜 로그인 토큰입니다');
    }

    if (dto.provider === 'google') {
      return this.handleGoogleLogin(dto.providerToken, dto.serverAuthCode);
    }

    // Fallback for other providers
    let user = await this.userRepository.findOne({
      where: {
        provider: dto.provider,
        provider_id: dto.providerToken,
      },
    });

    if (!user) {
      user = this.userRepository.create({
        provider: dto.provider,
        provider_id: dto.providerToken,
        email: null,
        password_hash: null,
      });
      user = await this.userRepository.save(user);
    }

    return this.generateTokens(user);
  }

  private async handleGoogleLogin(idToken: string, serverAuthCode?: string) {
    // Step 1: Verify ID token with Google
    let googleUser: { sub: string; email: string; name: string };
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!res.ok) throw new Error('Token verification failed');
      const payload = await res.json();
      googleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split('@')[0] || 'User',
      };
    } catch (error) {
      this.logger.error(`Google ID token verification failed: ${error.message}`);
      throw new BadRequestException('Google 토큰 검증에 실패했습니다');
    }

    // Step 2: Find or create user
    let user = await this.userRepository.findOne({
      where: { provider: 'google', provider_id: googleUser.sub },
    });

    if (!user) {
      // Check if email already exists with different provider
      if (googleUser.email) {
        user = await this.userRepository.findOne({
          where: { email: googleUser.email },
        });
      }
    }

    // Step 3: Exchange server auth code for access/refresh tokens (if provided)
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (serverAuthCode) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: serverAuthCode,
            client_id: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
            client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
            redirect_uri: '',
            grant_type: 'authorization_code',
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token;
        }
      } catch (error) {
        this.logger.warn(`Failed to exchange auth code: ${error.message}`);
      }
    }

    if (!user) {
      user = this.userRepository.create({
        provider: 'google',
        provider_id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        password_hash: null,
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
      });
    } else {
      user.provider = 'google';
      user.provider_id = googleUser.sub;
      user.name = googleUser.name;
      if (accessToken) user.google_access_token = accessToken;
      if (refreshToken) user.google_refresh_token = refreshToken;
    }

    user = await this.userRepository.save(user);
    return this.generateTokens(user);
  }

  /**
   * Refresh the user's Google access token using their stored refresh token
   */
  async refreshGoogleToken(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.google_refresh_token) return null;

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: user.google_refresh_token,
          client_id: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
          client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
          grant_type: 'refresh_token',
        }),
      });

      if (!res.ok) {
        this.logger.error('Google token refresh failed');
        return null;
      }

      const data = await res.json();
      user.google_access_token = data.access_token;
      await this.userRepository.save(user);
      return data.access_token;
    } catch (error) {
      this.logger.error(`Google token refresh error: ${error.message}`);
      return null;
    }
  }

  /**
   * Handle Google OAuth authorization code (server-side flow).
   * Exchanges the code for tokens, verifies user info, and creates/updates user.
   */
  async handleGoogleAuthCode(code: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET', '');
    const serverBaseUrl = this.configService.get<string>('SERVER_BASE_URL', 'http://localhost:3000');
    const callbackUrl = `${serverBaseUrl}/api/v1/auth/google/callback`;

    // Step 1: Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      this.logger.error(`Google token exchange failed: ${errBody}`);
      throw new BadRequestException('Google 인증 코드 교환에 실패했습니다');
    }

    const tokenData = await tokenRes.json();
    const googleAccessToken = tokenData.access_token;
    const googleRefreshToken = tokenData.refresh_token;
    const idToken = tokenData.id_token;

    // Step 2: Get user info from ID token or userinfo endpoint
    let googleUser: { sub: string; email: string; name: string };

    if (idToken) {
      const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (infoRes.ok) {
        const payload = await infoRes.json();
        googleUser = {
          sub: payload.sub,
          email: payload.email,
          name: payload.name || payload.email?.split('@')[0] || 'User',
        };
      } else {
        throw new BadRequestException('Google ID 토큰 검증에 실패했습니다');
      }
    } else {
      // Fallback: use access token to get user info
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!infoRes.ok) throw new BadRequestException('Google 사용자 정보를 가져올 수 없습니다');
      const info = await infoRes.json();
      googleUser = { sub: info.id, email: info.email, name: info.name || 'User' };
    }

    // Step 3: Find or create user
    let user = await this.userRepository.findOne({
      where: { provider: 'google', provider_id: googleUser.sub },
    });

    if (!user && googleUser.email) {
      user = await this.userRepository.findOne({ where: { email: googleUser.email } });
    }

    if (!user) {
      user = this.userRepository.create({
        provider: 'google',
        provider_id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        password_hash: null,
        google_access_token: googleAccessToken,
        google_refresh_token: googleRefreshToken,
      });
    } else {
      user.provider = 'google';
      user.provider_id = googleUser.sub;
      user.name = googleUser.name;
      user.google_access_token = googleAccessToken;
      if (googleRefreshToken) user.google_refresh_token = googleRefreshToken;
    }

    user = await this.userRepository.save(user);
    return this.generateTokens(user);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
