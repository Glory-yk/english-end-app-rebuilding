import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizzes1700000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quizzes" (
        "id"         UUID DEFAULT uuid_generate_v4() NOT NULL,
        "video_id"   UUID NOT NULL,
        "profile_id" UUID NOT NULL,
        "type"       VARCHAR(20) NOT NULL,
        "question"   JSONB NOT NULL,
        "difficulty" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quizzes_video" FOREIGN KEY ("video_id")
          REFERENCES "videos" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quizzes_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profiles" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_quizzes_profile" ON "quizzes" ("profile_id");
      CREATE INDEX "IDX_quizzes_video" ON "quizzes" ("video_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quizzes"`);
  }
}
