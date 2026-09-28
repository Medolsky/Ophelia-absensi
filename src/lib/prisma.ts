import { PrismaClient } from "@prisma/client";

const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_Dk38oNwdIWOb@ep-green-haze-b3obseb4-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// Support Vercel Postgres / Neon auto-injected environment variable names
// Prefer connection pooler URL (10x faster connection establishment in serverless)
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("-pooler")) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    DEFAULT_DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

// Always reuse Prisma instance on globalThis across warm serverless requests
globalForPrisma.prisma = prisma;
