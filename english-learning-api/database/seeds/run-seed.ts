import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedVideos } from './sample-videos.seed';
import { seedVocabulary } from './sample-vocabulary.seed';

dotenv.config();

async function runSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://english_app:password@localhost:5432/english_app',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected. Running seeds...');

    await seedVideos(dataSource);
    await seedVocabulary(dataSource);

    console.log('All seeds completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
