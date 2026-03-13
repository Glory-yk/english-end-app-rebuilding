import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
});
