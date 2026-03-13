import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://english_app:password@localhost:5432/english_app',
  entities: ['src/**/*.entity.ts'],
  migrations: ['database/migrations/*.ts'],
});
