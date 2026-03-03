import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "@/db/auth-schema";
import * as appSchema from "@/db/schema";

const schema = {
  ...authSchema,
  ...appSchema,
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

function isNeonConnection(url: string): boolean {
  return url.includes("neon.tech") || url.includes("neon.com");
}

function normalizePostgresUrl(url: string): string {
  if (url.startsWith("postgresql+psycopg://")) {
    return url.replace("postgresql+psycopg://", "postgresql://");
  }
  return url;
}

function createDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL as string;

  if (isNeonConnection(databaseUrl)) {
    const sql = neon(databaseUrl);
    return drizzleNeon(sql, {
      schema,
      casing: "snake_case",
    });
  }

  const normalizedUrl = normalizePostgresUrl(databaseUrl);
  const sql = postgres(normalizedUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: false,
    prepare: true,
  });
  return drizzlePostgres(sql, {
    schema,
    casing: "snake_case",
  });
}

export const db = createDatabaseConnection();
