import { prisma } from "../db";

export async function enqueue(type: string, payload: unknown, runAfter = new Date()) {
  return prisma.job.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      runAfter,
      maxAttempts: 3,
    },
  });
}

export async function recoverStale() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await prisma.job.findMany({ where: { status: "RUNNING", lockedAt: { lt: cutoff } } });
  for (const job of stale) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "QUEUED", lockedAt: null, attempts: Math.max(0, job.attempts - 1) },
    });
  }
  return stale.length;
}

export async function claimNext() {
  const now = new Date();
  const job = await prisma.job.findFirst({
    where: { status: "QUEUED", runAfter: { lte: now } },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;
  const updated = await prisma.job.updateMany({
    where: { id: job.id, status: "QUEUED" },
    data: { status: "RUNNING", lockedAt: now, attempts: { increment: 1 } },
  });
  if (updated.count === 0) return null;
  return prisma.job.findUnique({ where: { id: job.id } });
}

export async function completeJob(id: string) {
  await prisma.job.update({ where: { id }, data: { status: "DONE", lockedAt: null, error: null } });
}

export async function failJob(id: string, attempts: number, maxAttempts: number, message: string) {
  if (attempts >= maxAttempts) {
    await prisma.job.update({ where: { id }, data: { status: "FAILED", lockedAt: null, error: message } });
    return "final" as const;
  }
  const delay = attempts <= 1 ? 60_000 : 5 * 60_000;
  await prisma.job.update({
    where: { id },
    data: { status: "QUEUED", lockedAt: null, error: message, runAfter: new Date(Date.now() + delay) },
  });
  return "retry" as const;
}
