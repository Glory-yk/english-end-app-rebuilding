import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import { Subtitle } from './entities/subtitle.entity';
import { SearchVideoDto } from './dto/search-video.dto';
import { Profile } from '@/profiles/entities/profile.entity';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Subtitle)
    private readonly subtitleRepository: Repository<Subtitle>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async findAll(searchDto: SearchVideoDto) {
    const { q, category, difficulty, ageGroup, page = 1, limit = 20 } = searchDto;

    const qb = this.videoRepository.createQueryBuilder('video');

    if (q) {
      qb.andWhere(
        '(video.title ILIKE :q OR video.channel_name ILIKE :q OR video.tags ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    if (category) {
      qb.andWhere('video.category = :category', { category });
    }

    if (difficulty) {
      qb.andWhere('video.difficulty = :difficulty', { difficulty });
    }

    if (ageGroup) {
      qb.andWhere('video.age_group LIKE :ageGroup', {
        ageGroup: `%${ageGroup}%`,
      });
    }

    qb.orderBy('video.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['subtitles'],
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다');
    }

    return video;
  }

  async findRecommended(profileId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다');
    }

    const qb = this.videoRepository.createQueryBuilder('video');

    if (profile.age_group) {
      qb.andWhere('video.age_group LIKE :ageGroup', {
        ageGroup: `%${profile.age_group}%`,
      });
    }

    if (profile.level) {
      qb.andWhere('video.difficulty = :difficulty', {
        difficulty: profile.level,
      });
    }

    qb.orderBy('video.view_count', 'DESC').take(20);

    return qb.getMany();
  }

  async importVideo(youtubeUrl: string): Promise<Video> {
    const youtubeId = this.extractYoutubeId(youtubeUrl);

    if (!youtubeId) {
      throw new BadRequestException('유효하지 않은 YouTube URL입니다');
    }

    const existingVideo = await this.videoRepository.findOne({
      where: { youtube_id: youtubeId },
    });

    if (existingVideo) {
      return existingVideo;
    }

    // Placeholder: In production, this would call YouTube Data API
    // to fetch video metadata (title, channel, thumbnail, duration, etc.)
    const video = this.videoRepository.create({
      youtube_id: youtubeId,
      title: `YouTube Video ${youtubeId}`,
      channel_name: null,
      thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      duration_sec: null,
      difficulty: null,
      category: null,
    });

    return this.videoRepository.save(video);
  }

  async getSubtitles(videoId: string): Promise<Subtitle[]> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다');
    }

    return this.subtitleRepository.find({
      where: { video_id: videoId },
      order: { start_ms: 'ASC' },
    });
  }

  private extractYoutubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
