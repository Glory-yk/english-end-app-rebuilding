import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity('vocabulary')
@Unique(['word', 'pos'])
export class Vocabulary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  word: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  phonetic: string | null;

  @Column({ type: 'text' })
  meaning_ko: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pos: string | null;

  @Column({ type: 'text', nullable: true })
  example_en: string | null;

  @Column({ type: 'text', nullable: true })
  example_ko: string | null;

  @Column({ type: 'int', default: 1 })
  difficulty: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audio_url: string | null;
}
