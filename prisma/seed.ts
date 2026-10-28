import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { OrderStatus, PaymentMethod } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BRANCHES = [
  { code: "JURONG_WEST", name: "Jurong West" },
  { code: "CHANGI_T2", name: "Changi Airport Terminal 2" },
  { code: "CBD", name: "Singapore CBD" },
];

const MENU = [
  { name: "Kopi", priceCents: 150 },
  { name: "Teh Tarik", priceCents: 180 },
  { name: "Flat White", priceCents: 520 },
  { name: "Iced Latte", priceCents: 580 },
  { name: "Matcha Latte", priceCents: 620 },
  { name: "Kaya Toast Set", priceCents: 450 },
  { name: "Chicken Rice", priceCents: 650 },
  { name: "Nasi Lemak", priceCents: 580 },
  { name: "Croissant", priceCents: 380 },
  { name: "Cheesecake Slice", priceCents: 550 },
];

const PAYMENTS: PaymentMethod[] = ["CASH", "CARD", "CARD", "PAYNOW", "PAYNOW"];
const CUSTOMERS = ["Wei Ling", "Aisyah", "Priya", "Daniel", "Mei", "Raj", "Hui Min"];

// Deterministic pseudo-random so reseeding gives similar data.
let state = 42;
function rand() {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function parseSeedUsers() {
  const raw = process.env.SEED_USERS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      // email:password:name — the password may itself contain ':'.
      const first = entry.indexOf(":");
      const last = entry.lastIndexOf(":");
      if (first === -1 || last === first) {
        throw new Error(`Invalid SEED_USERS entry (expected email:password:name): ${entry}`);
      }
      return {
        email: entry.slice(0, first).toLowerCase(),
        password: entry.slice(first + 1, last),
        name: entry.slice(last + 1),
      };
    });
}

async function seedUsers() {
  const users = parseSeedUsers();
  if (users.length === 0) throw new Error("SEED_USERS is empty");
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: { email: u.email, name: u.name, passwordHash },
    });
  }
  console.log(`Seeded ${users.length} user(s)`);
}

async function seedBranches() {
  for (const b of BRANCHES) {
    await prisma.branch.upsert({ where: { code: b.code }, update: { name: b.name }, create: b });
  }
  console.log(`Seeded ${BRANCHES.length} branches`);
}

async function seedOrders() {
  if ((await prisma.order.count()) > 0) {
    console.log("Orders already exist, skipping sample orders");
    return;
  }
  const branches = await prisma.branch.findMany();
  const DAY = 24 * 60 * 60 * 1000;
  const SGT_OFFSET = 8 * 60 * 60 * 1000;
  // Midnight today in Singapore time, expressed as a UTC instant.
  const sgNow = new Date(Date.now() + SGT_OFFSET);
  const todayMidnight = Date.UTC(sgNow.getUTCFullYear(), sgNow.getUTCMonth(), sgNow.getUTCDate()) - SGT_OFFSET;

  const data = [];
  for (let d = 59; d >= 0; d--) {
    for (const branch of branches) {
      const count = 12 + Math.floor(rand() * 14);
      for (let i = 0; i < count; i++) {
        const hour = 7 + Math.floor(rand() * 14); // 07:00–20:59 SGT
        const minute = Math.floor(rand() * 60);
        const orderedAt = new Date(todayMidnight - d * DAY + (hour * 60 + minute) * 60 * 1000);
        if (orderedAt.getTime() > Date.now()) continue;

        const lines = 1 + Math.floor(rand() * 3);
        const items = Array.from({ length: lines }, () => {
          const m = pick(MENU);
          return { name: m.name, quantity: 1 + Math.floor(rand() * 2), unitPriceCents: m.priceCents };
        });
        const r = rand();
        const status: OrderStatus = r < 0.04 ? "CANCELLED" : r < 0.1 ? "PENDING" : "PAID";
        data.push({
          branchId: branch.id,
          orderedAt,
          status,
          paymentMethod: pick(PAYMENTS),
          customerName: rand() < 0.3 ? pick(CUSTOMERS) : null,
          totalCents: items.reduce((sum, it) => sum + it.quantity * it.unitPriceCents, 0),
          items,
        });
      }
    }
  }

  for (const o of data) {
    const { items, ...order } = o;
    await prisma.order.create({ data: { ...order, items: { create: items } } });
  }
  console.log(`Seeded ${data.length} sample orders`);
}

async function main() {
  await seedUsers();
  await seedBranches();
  await seedOrders();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
