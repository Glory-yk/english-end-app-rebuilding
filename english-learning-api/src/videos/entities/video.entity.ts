import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subtitle } from './subtitle.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  youtube_id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  channel_name: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string | null;

  @Column({ type: 'int', nullable: true })
  duration_sec: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  difficulty: string | null;

  @Column({ type: 'text', array: false, nullable: true, comment: 'comma-separated age groups' })
  age_group: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'text', array: false, nullable: true, comment: 'comma-separated tags' })
  tags: string | null;

  @Column({ type: 'text', array: false, nullable: true, comment: 'comma-separated subtitle languages' })
  subtitle_lang: string | null;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Subtitle, (subtitle) => subtitle.video, { cascade: true })
  subtitles: Subtitle[];
}
