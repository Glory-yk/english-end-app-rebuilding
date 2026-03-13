import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfiles1700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "id"             UUID DEFAULT uuid_generate_v4() NOT NULL,
        "user_id"        UUID NOT NULL,
        "name"           VARCHAR(100) NOT NULL,
        "type"           VARCHAR(10) NOT NULL,
        "age_group"      VARCHAR(10),
        "level"          VARCHAR(10) NOT NULL DEFAULT 'beginner',
        "avatar_url"     VARCHAR(500),
        "daily_goal_min" INTEGER NOT NULL DEFAULT 20,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_profiles_user_id" ON "profiles" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "profiles"`);
  }
}
