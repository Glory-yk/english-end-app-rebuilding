import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendPushNotification(expoPushToken: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    // TODO: Implement Expo Push Notifications
    this.logger.log(`Push notification: ${title} -> ${expoPushToken}`);
  }

  async sendReviewReminder(profileId: string, wordCount: number): Promise<void> {
    this.logger.log(`Review reminder: ${wordCount} words due for profile ${profileId}`);
    // TODO: Look up push token and send notification
  }

  async sendStreakReminder(profileId: string, currentStreak: number): Promise<void> {
    this.logger.log(`Streak reminder: ${currentStreak} days for profile ${profileId}`);
    // TODO: "Don't break your streak!" notification
  }
}
