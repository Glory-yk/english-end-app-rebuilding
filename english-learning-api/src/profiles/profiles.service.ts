import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<Profile> {
    const profile = this.profileRepository.create({
      user_id: userId,
      name: dto.name,
      type: dto.type,
      age_group: dto.ageGroup || null,
      level: dto.level || 'beginner',
      avatar_url: dto.avatarUrl || null,
      daily_goal_min: dto.dailyGoalMin || 20,
    });

    return this.profileRepository.save(profile);
  }

  async findAllByUser(userId: string): Promise<Profile[]> {
    return this.profileRepository.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }

    return profile;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Profile> {
    const profile = await this.findOne(id);

    if (profile.user_id !== userId) {
      throw new ForbiddenException('이 프로필을 수정할 권한이 없습니다');
    }

    if (dto.name !== undefined) profile.name = dto.name;
    if (dto.type !== undefined) profile.type = dto.type;
    if (dto.ageGroup !== undefined) profile.age_group = dto.ageGroup;
    if (dto.level !== undefined) profile.level = dto.level;
    if (dto.avatarUrl !== undefined) profile.avatar_url = dto.avatarUrl;
    if (dto.dailyGoalMin !== undefined) profile.daily_goal_min = dto.dailyGoalMin;

    return this.profileRepository.save(profile);
  }

  async remove(id: string, userId: string): Promise<void> {
    const profile = await this.findOne(id);

    if (profile.user_id !== userId) {
      throw new ForbiddenException('이 프로필을 삭제할 권한이 없습니다');
    }

    await this.profileRepository.remove(profile);
  }
}
