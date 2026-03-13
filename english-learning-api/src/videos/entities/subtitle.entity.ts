import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Video } from './video.entity';
import { WordAnalysis } from '../interfaces/words-json.interface';

@Entity('subtitles')
@Index(['video_id', 'start_ms'])
export class Subtitle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  video_id: string;

  @Column({ type: 'varchar', length: 10 })
  lang: string;

  @Column({ type: 'int' })
  start_ms: number;

  @Column({ type: 'int' })
  end_ms: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  words_json: WordAnalysis[] | null;

  @ManyToOne(() => Video, (video) => video.subtitles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
