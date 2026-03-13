import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE "users" (
        "id"            UUID DEFAULT uuid_generate_v4() NOT NULL,
        "email"         VARCHAR(255) UNIQUE,
        "password_hash" VARCHAR(255),
        "provider"      VARCHAR(20) NOT NULL DEFAULT 'local',
        "provider_id"   VARCHAR(255),
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );

      CREATE INDEX "IDX_users_email" ON "users" ("email");
      CREATE INDEX "IDX_users_provider" ON "users" ("provider", "provider_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
