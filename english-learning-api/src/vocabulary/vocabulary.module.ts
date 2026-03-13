import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vocabulary } from './entities/vocabulary.entity';
import { UserVocabulary } from './entities/user-vocabulary.entity';
import { SM2Service } from './srs/sm2.service';
import { VocabularyService } from './vocabulary.service';
import { VocabularyController } from './vocabulary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vocabulary, UserVocabulary])],
  providers: [SM2Service, VocabularyService],
  controllers: [VocabularyController],
  exports: [TypeOrmModule, SM2Service, VocabularyService],
})
export class VocabularyModule {}
