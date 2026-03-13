import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubtitles1700000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subtitles" (
        "id"         UUID DEFAULT uuid_generate_v4() NOT NULL,
        "video_id"   UUID NOT NULL,
        "lang"       VARCHAR(10) NOT NULL,
        "start_ms"   INTEGER NOT NULL,
        "end_ms"     INTEGER NOT NULL,
        "text"       TEXT NOT NULL,
        "words_json" JSONB,
        CONSTRAINT "PK_subtitles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subtitles_video" FOREIGN KEY ("video_id")
          REFERENCES "videos" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_subtitles_video_start" ON "subtitles" ("video_id", "start_ms");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subtitles"`);
  }
}
