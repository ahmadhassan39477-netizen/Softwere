#!/usr/bin/env node
/**
 * Pick Prisma schema from DATABASE_URL and optionally push tables.
 * Usage:
 *   node scripts/prisma-prepare.mjs              # generate only
 *   node scripts/prisma-prepare.mjs --push       # generate + db push (prod/Neon)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const schema = isPostgres
  ? "prisma/schema.postgres.prisma"
  : "prisma/schema.prisma";

if (!existsSync(schema)) {
  console.error(`[prisma-prepare] Missing schema file: ${schema}`);
  process.exit(1);
}

const doPush = process.argv.includes("--push");

function run(args) {
  console.log(`[prisma-prepare] npx ${args.join(" ")}`);
  const r = spawnSync("npx", args, { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(["prisma", "generate", `--schema=${schema}`]);

if (doPush) {
  if (!isPostgres) {
    console.log("[prisma-prepare] Skipping db push (non-Postgres DATABASE_URL)");
  } else {
    // Create/align User, Account, Session, Order, … on Neon without interactive prompts
    run(["prisma", "db", "push", `--schema=${schema}`, "--skip-generate"]);
  }
}

console.log(
  `[prisma-prepare] ready schema=${schema} provider=${isPostgres ? "postgresql" : "sqlite"} push=${doPush && isPostgres}`,
);
