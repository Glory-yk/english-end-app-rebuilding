import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { UserVocabulary } from '@/vocabulary/entities/user-vocabulary.entity';
import { LearningSession } from '@/progress/entities/learning-session.entity';
import { Quiz } from '@/quiz/entities/quiz.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  type: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  age_group: string | null;

  @Column({ type: 'varchar', length: 10, default: 'beginner' })
  level: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string | null;

  @Column({ type: 'int', default: 20 })
  daily_goal_min: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.profiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => UserVocabulary, (uv) => uv.profile, { cascade: true })
  user_vocabularies: UserVocabulary[];

  @OneToMany(() => LearningSession, (ls) => ls.profile, { cascade: true })
  learning_sessions: LearningSession[];

  @OneToMany(() => Quiz, (quiz) => quiz.profile, { cascade: true })
  quizzes: Quiz[];
}
