import { PrismaClient } from "@prisma/client";
import { DEFAULT_INSTITUTIONS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Neon PostgreSQL database...");

  // 1. Seed Institutions
  for (const inst of DEFAULT_INSTITUTIONS) {
    const upserted = await prisma.institution.upsert({
      where: { slug: inst.slug },
      update: {
        name: inst.name,
        description: inst.description,
        logo: inst.logo,
        primaryColor: inst.primaryColor,
        currencySymbol: inst.currencySymbol || "Rp",
        defaultHourlyRate: inst.defaultHourlyRate || 50000,
        status: inst.status || "ACTIVE",
      },
      create: {
        id: inst.id,
        name: inst.name,
        slug: inst.slug,
        description: inst.description,
        logo: inst.logo,
        primaryColor: inst.primaryColor,
        currencySymbol: inst.currencySymbol || "Rp",
        defaultHourlyRate: inst.defaultHourlyRate || 50000,
        status: inst.status || "ACTIVE",
      },
    });

    console.log(`✓ Institution: ${upserted.name} (${upserted.slug})`);

    // Discord Roles for this institution
    if (inst.discordRoleNames && inst.discordRoleNames.length > 0) {
      for (const roleName of inst.discordRoleNames) {
        const dummyRoleId = `role-${inst.slug}-${roleName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        await prisma.discordRole.upsert({
          where: {
            discordRoleId_institutionId: {
              discordRoleId: dummyRoleId,
              institutionId: upserted.id,
            },
          },
          update: {
            name: roleName,
          },
          create: {
            discordRoleId: dummyRoleId,
            name: roleName,
            institutionId: upserted.id,
            permissionLevel: roleName.toUpperCase().includes("CHIEF") || roleName.toUpperCase().includes("PETINGGI") ? "LEADER" : "MEMBER",
          },
        });
      }
    }
  }

  // 2. Seed Positions
  const defaultPositions = [
    { name: "Chief of Police", instSlug: "police", permission: "LEADER", rate: 75000 },
    { name: "Officer", instSlug: "police", permission: "MEMBER", rate: 50000 },
    { name: "Petinggi Medis", instSlug: "medical", permission: "LEADER", rate: 70000 },
    { name: "Medis", instSlug: "medical", permission: "MEMBER", rate: 50000 },
    { name: "Petinggi Bengkel", instSlug: "mechanic", permission: "LEADER", rate: 70000 },
    { name: "Mekanik", instSlug: "mechanic", permission: "MEMBER", rate: 55000 },
    { name: "Petinggi Resto", instSlug: "restaurant", permission: "LEADER", rate: 65000 },
    { name: "Server Resto", instSlug: "restaurant", permission: "MEMBER", rate: 45000 },
    { name: "Walikota", instSlug: "pemerintah", permission: "LEADER", rate: 100000 },
    { name: "Staff Sipil", instSlug: "pemerintah", permission: "MEMBER", rate: 50000 },
  ];

  for (const pos of defaultPositions) {
    const inst = await prisma.institution.findUnique({ where: { slug: pos.instSlug } });
    if (!inst) continue;
    const existing = await prisma.position.findFirst({
      where: { name: pos.name, institutionId: inst.id },
    });
    if (!existing) {
      await prisma.position.create({
        data: {
          name: pos.name,
          institutionId: inst.id,
          permissionLevel: pos.permission,
          hourlyRate: pos.rate,
        },
      });
    }
  }

  console.log("✓ Positions seeded.");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
