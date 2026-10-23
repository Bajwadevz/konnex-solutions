import { execSync } from "child_process";
import { enableSqlitePragmas, prisma } from "./db";
import { seedAll } from "../../prisma/seed";

let ready: Promise<void> | null = null;

async function setup() {
  try {
    await prisma.voice.count();
    await enableSqlitePragmas();
  } catch {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    await enableSqlitePragmas();
  }
  if ((await prisma.voice.count()) === 0) await seedAll();
}

export function bootstrap() {
  if (!ready) ready = setup();
  return ready;
}
