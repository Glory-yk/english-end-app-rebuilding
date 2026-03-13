import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserVocabulary1700000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_vocabulary" (
        "id"            UUID DEFAULT uuid_generate_v4() NOT NULL,
        "profile_id"    UUID NOT NULL,
        "vocabulary_id" UUID NOT NULL,
        "source_video"  UUID,
        "ease_factor"   FLOAT NOT NULL DEFAULT 2.5,
        "interval_days" INTEGER NOT NULL DEFAULT 0,
        "repetitions"   INTEGER NOT NULL DEFAULT 0,
        "next_review"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "last_reviewed" TIMESTAMPTZ,
        "status"        VARCHAR(10) NOT NULL DEFAULT 'new',
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_vocabulary" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_vocabulary_profile_vocab" UNIQUE ("profile_id", "vocabulary_id"),
        CONSTRAINT "FK_user_vocabulary_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profiles" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_vocabulary_vocabulary" FOREIGN KEY ("vocabulary_id")
          REFERENCES "vocabulary" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_vocabulary_video" FOREIGN KEY ("source_video")
          REFERENCES "videos" ("id") ON DELETE SET NULL
      );

      CREATE INDEX "IDX_user_vocabulary_profile" ON "user_vocabulary" ("profile_id");
      CREATE INDEX "IDX_user_vocabulary_next_review" ON "user_vocabulary" ("profile_id", "next_review");
      CREATE INDEX "IDX_user_vocabulary_status" ON "user_vocabulary" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_vocabulary"`);
  }
}
