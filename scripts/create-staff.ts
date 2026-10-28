import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Reads one line from the TTY. When `mask` is set, each typed character is shown as `*`.
function ask(question: string, mask = false): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = "";
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\nCancelled.\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (ch < " ") continue; // ignore other control characters
        value += ch;
        process.stdout.write(mask ? "*" : ch);
      }
    };
    stdin.on("data", onData);
  });
}

async function askRequired(question: string, validate?: (v: string) => string | null, mask = false) {
  for (;;) {
    const raw = await ask(question, mask);
    const value = mask ? raw : raw.trim(); // spaces are legitimate in a password
    if (!value) {
      console.log("  A value is required.");
      continue;
    }
    const error = validate?.(value);
    if (error) {
      console.log(`  ${error}`);
      continue;
    }
    return value;
  }
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error("create-staff must be run in an interactive terminal (needed to mask the password).");
  }

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  if (branches.length === 0) {
    throw new Error("No branches found. Run `bun run db:seed` first.");
  }

  console.log("Create a new staff account\n");

  const name = await askRequired("Name: ");

  console.log("\nBranches:");
  branches.forEach((b, i) => console.log(`  ${i + 1}. ${b.name} (${b.code})`));
  const choice = await askRequired("Branch (number or code): ", (v) =>
    resolveBranch(v) ? null : "Pick a number from the list or a branch code.",
  );
  function resolveBranch(v: string) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= branches.length) return branches[n - 1];
    return branches.find((b) => b.code.toLowerCase() === v.toLowerCase());
  }
  const branch = resolveBranch(choice)!;

  const email = (
    await askRequired("\nEmail: ", (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address."))
  ).toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error(`A user with ${email} already exists.`);
  }

  let password: string;
  for (;;) {
    password = await askRequired(
      "Password: ",
      (v) => (v.length >= 8 ? null : "Password must be at least 8 characters."),
      true,
    );
    const confirm = await ask("Confirm password: ", true);
    if (confirm === password) break;
    console.log("  Passwords do not match, try again.");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      branchId: branch.id,
    },
  });
  console.log(`\nCreated ${user.name} <${user.email}> at ${branch.name}.`);
}

main()
  .catch((e) => {
    console.error(`\nError: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
