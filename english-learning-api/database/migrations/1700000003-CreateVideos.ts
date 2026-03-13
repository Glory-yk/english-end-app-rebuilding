import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVideos1700000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "videos" (
        "id"            UUID DEFAULT uuid_generate_v4() NOT NULL,
        "youtube_id"    VARCHAR(20) NOT NULL UNIQUE,
        "title"         VARCHAR(500) NOT NULL,
        "channel_name"  VARCHAR(200),
        "thumbnail_url" VARCHAR(500),
        "duration_sec"  INTEGER,
        "difficulty"    VARCHAR(10),
        "age_group"     TEXT,
        "category"      VARCHAR(50),
        "tags"          TEXT,
        "subtitle_lang" TEXT,
        "view_count"    INTEGER NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_videos" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX "IDX_videos_youtube_id" ON "videos" ("youtube_id");
      CREATE INDEX "IDX_videos_category" ON "videos" ("category");
      CREATE INDEX "IDX_videos_difficulty" ON "videos" ("difficulty");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "videos"`);
  }
}
