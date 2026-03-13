import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Profile } from '@/profiles/entities/profile.entity';
import { Vocabulary } from './vocabulary.entity';
import { Video } from '@/videos/entities/video.entity';

@Entity('user_vocabulary')
@Unique(['profile_id', 'vocabulary_id'])
export class UserVocabulary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  profile_id: string;

  @Column({ type: 'uuid' })
  vocabulary_id: string;

  @Column({ type: 'uuid', nullable: true })
  source_video: string | null;

  @Column({ type: 'float', default: 2.5 })
  ease_factor: number;

  @Column({ type: 'int', default: 0 })
  interval_days: number;

  @Column({ type: 'int', default: 0 })
  repetitions: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  next_review: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_reviewed: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Profile, (profile) => profile.user_vocabularies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ManyToOne(() => Vocabulary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: Vocabulary;

  @ManyToOne(() => Video, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_video' })
  video: Video | null;
}
