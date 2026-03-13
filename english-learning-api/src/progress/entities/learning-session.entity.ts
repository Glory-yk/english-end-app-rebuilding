import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Profile } from '@/profiles/entities/profile.entity';
import { Video } from '@/videos/entities/video.entity';

@Entity('learning_sessions')
export class LearningSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  profile_id: string;

  @Column({ type: 'uuid', nullable: true })
  video_id: string | null;

  @Column({ type: 'int', nullable: true })
  watched_sec: number | null;

  @Column({ type: 'int', default: 0 })
  words_learned: number;

  @Column({ type: 'float', nullable: true })
  quiz_score: number | null;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Profile, (profile) => profile.learning_sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ManyToOne(() => Video, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'video_id' })
  video: Video | null;
}
