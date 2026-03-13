import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLearningSessions1700000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "learning_sessions" (
        "id"            UUID DEFAULT uuid_generate_v4() NOT NULL,
        "profile_id"    UUID NOT NULL,
        "video_id"      UUID,
        "watched_sec"   INTEGER,
        "words_learned" INTEGER NOT NULL DEFAULT 0,
        "quiz_score"    FLOAT,
        "completed"     BOOLEAN NOT NULL DEFAULT false,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_learning_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_learning_sessions_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profiles" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_learning_sessions_video" FOREIGN KEY ("video_id")
          REFERENCES "videos" ("id") ON DELETE SET NULL
      );

      CREATE INDEX "IDX_learning_sessions_profile" ON "learning_sessions" ("profile_id");
      CREATE INDEX "IDX_learning_sessions_created" ON "learning_sessions" ("profile_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "learning_sessions"`);
  }
}
