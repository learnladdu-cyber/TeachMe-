import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const planDefs = [
  { name: "Free", agentLimit: 2, monthlyTickets: 100, retentionDays: 30, priceMonthly: 0, features: ["core"] },
  {
    name: "Growth",
    agentLimit: 10,
    monthlyTickets: 2000,
    retentionDays: 180,
    priceMonthly: 49,
    features: ["automation", "sla", "chat"],
  },
  {
    name: "Business",
    agentLimit: 50,
    monthlyTickets: 20000,
    retentionDays: 365,
    priceMonthly: 149,
    features: ["automation", "sla", "chat", "analytics"],
  },
  {
    name: "Enterprise",
    agentLimit: null,
    monthlyTickets: null,
    retentionDays: 1095,
    priceMonthly: 499,
    features: ["sso", "governance"],
  },
];

async function main() {
  console.log("Seeding plan catalog...");
  const plans = await Promise.all(
    planDefs.map((p) =>
      prisma.plan.upsert({
        where: { name: p.name },
        update: { priceMonthly: p.priceMonthly, currency: "INR" },
        create: { ...p, currency: "INR" },
      }),
    ),
  );
  console.log("Plans ready:", plans.map((p) => p.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
