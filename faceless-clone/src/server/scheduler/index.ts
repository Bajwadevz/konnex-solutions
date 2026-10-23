import { parseJson } from "../../lib/utils";
import { generationPlan, upcomingPublishSlots } from "../../lib/schedule";
import { prisma } from "../db";
import { enqueue } from "../queue";

export async function runSchedulerTick(now = new Date()) {
  const seriesList = await prisma.series.findMany({
    where: { status: "ACTIVE" },
    include: { accounts: { include: { account: true } } },
  });

  for (const series of seriesList) {
    const slots = upcomingPublishSlots({
      now,
      timezone: series.timezone,
      publishTimes: parseJson<string[]>(series.publishTimes, []),
      publishDays: parseJson<number[]>(series.publishDays, []),
      leadHours: series.leadHours,
    });
    for (const slot of slots) {
      const existing = await prisma.video.findFirst({
        where: {
          seriesId: series.id,
          status: { not: "CANCELLED" },
          scheduledFor: { gte: new Date(slot.getTime() - 1000), lte: new Date(slot.getTime() + 1000) },
        },
      });
      if (existing) continue;
      const video = await prisma.video.create({
        data: { seriesId: series.id, status: "PENDING", scheduledFor: slot },
      });
      const plan = generationPlan(slot, now, series.leadHours);
      await enqueue("GENERATE_VIDEO", { videoId: video.id }, plan.runAfter);
    }
  }

  const due = await prisma.video.findMany({
    where: {
      scheduledFor: { lte: now },
      status: { in: ["READY", "APPROVED"] },
      series: { autoPublish: true, status: "ACTIVE" },
    },
    include: { series: { include: { accounts: { include: { account: true } } } }, publications: true },
  });

  for (const video of due) {
    if (video.status === "READY" && !video.series.autoApprove) continue;
    if (video.series.accounts.length === 0) continue;
    let queued = 0;
    for (const link of video.series.accounts) {
      const existing = video.publications.find((item) => item.accountId === link.accountId && item.status !== "FAILED");
      if (existing) continue;
      const publication = await prisma.publication.create({
        data: { videoId: video.id, accountId: link.accountId, platform: link.account.platform, status: "PENDING" },
      });
      await enqueue("PUBLISH_VIDEO", { publicationId: publication.id });
      queued += 1;
    }
    if (queued > 0) {
      await prisma.video.update({ where: { id: video.id }, data: { status: "PUBLISHING", error: null } });
    }
  }
}
