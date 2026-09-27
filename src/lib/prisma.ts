import { PrismaClient } from "@prisma/client";

// Support Vercel Postgres / Neon auto-injected environment variable names
// Prefer connection pooler URL (10x faster connection establishment in serverless)
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("-pooler")) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
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
