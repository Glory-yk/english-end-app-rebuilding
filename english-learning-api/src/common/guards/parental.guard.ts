import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ParentalGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const profile = request.profile;

    if (!profile) {
      throw new ForbiddenException('프로필이 필요합니다');
    }

    // Check if this route requires adult access
    const requiresAdult = this.reflector.get<boolean>('requiresAdult', context.getHandler());
    if (requiresAdult && profile.type !== 'adult') {
      throw new ForbiddenException('부모 인증이 필요합니다');
    }

    // For kids profiles, enforce time limits
    if (profile.type === 'child') {
      const kidsSettings = profile.kidsSettings;

      // Check if past lock-after time
      if (kidsSettings?.lockAfterTime) {
        const now = new Date();
        const [lockHour, lockMin] = kidsSettings.lockAfterTime.split(':').map(Number);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const lockMinutes = lockHour * 60 + lockMin;
        if (currentMinutes >= lockMinutes) {
          throw new ForbiddenException('사용 가능 시간이 지났습니다. 내일 다시 만나요!');
        }
      }

      // Check daily watch time limit
      if (kidsSettings?.dailyLimitMin && kidsSettings?.todayWatchedMin >= kidsSettings.dailyLimitMin) {
        throw new ForbiddenException('오늘의 시청 시간이 끝났습니다. 내일 또 만나요!');
      }

      // Check allowed categories for content requests
      if (kidsSettings?.allowedCategories && request.query?.category) {
        const requestedCategory = request.query.category;
        if (!kidsSettings.allowedCategories.includes(requestedCategory)) {
          throw new ForbiddenException('이 카테고리는 허용되지 않습니다');
        }
      }
    }

    return true;
  }
}
