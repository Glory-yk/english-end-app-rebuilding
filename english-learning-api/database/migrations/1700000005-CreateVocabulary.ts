import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVocabulary1700000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vocabulary" (
        "id"         UUID DEFAULT uuid_generate_v4() NOT NULL,
        "word"       VARCHAR(100) NOT NULL,
        "phonetic"   VARCHAR(200),
        "meaning_ko" TEXT NOT NULL,
        "pos"        VARCHAR(20),
        "example_en" TEXT,
        "example_ko" TEXT,
        "difficulty" INTEGER NOT NULL DEFAULT 1,
        "audio_url"  VARCHAR(500),
        CONSTRAINT "PK_vocabulary" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vocabulary_word_pos" UNIQUE ("word", "pos")
      );

      CREATE INDEX "IDX_vocabulary_word" ON "vocabulary" ("word");
      CREATE INDEX "IDX_vocabulary_difficulty" ON "vocabulary" ("difficulty");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vocabulary"`);
  }
}
