import "dotenv/config";
import cron from "node-cron";
import { bootstrap } from "./bootstrap";
import { prisma } from "./db";
import { videoLog } from "./log";
import { CancelledError, generateVideo, regenerateSceneImage } from "./pipeline/generateVideo";
import { publishVideo } from "./publish/run";
import { claimNext, completeJob, failJob, recoverStale } from "./queue";
import { runSchedulerTick } from "./scheduler";

let stopped = false;

async function dispatch(type: string, payload: string) {
  const data = JSON.parse(payload) as { videoId?: string; publicationId?: string; sceneIndex?: number; respeak?: boolean };
  if (type === "GENERATE_VIDEO" && data.videoId) {
    await generateVideo(data.videoId);
    return;
  }
  if (type === "RERENDER" && data.videoId) {
    await generateVideo(data.videoId, data.respeak ? "voice" : "render");
    return;
  }
  if (type === "REGENERATE_SCENE" && data.videoId && typeof data.sceneIndex === "number") {
    await regenerateSceneImage(data.videoId, data.sceneIndex);
    return;
  }
  if (type === "PUBLISH_VIDEO" && data.publicationId) {
    await publishVideo(data.publicationId);
    return;
  }
  if (type === "VOICE_PREVIEW") return;
  throw new Error(`Unknown job type ${type}.`);
}

async function loop() {
  while (!stopped) {
    const job = await claimNext();
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    try {
      await dispatch(job.type, job.payload);
      await completeJob(job.id);
    } catch (error) {
      if (error instanceof CancelledError) {
        await completeJob(job.id);
        continue;
      }
      const message = error instanceof Error ? error.message : "The worker hit an unexpected error.";
      const outcome = await failJob(job.id, job.attempts, job.maxAttempts, message);
      const data = JSON.parse(job.payload) as { videoId?: string; publicationId?: string };
      if (data.videoId) {
        await videoLog(data.videoId, message);
        if (outcome === "final") {
          await prisma.video.update({ where: { id: data.videoId }, data: { status: "FAILED", error: message } });
        } else {
          await prisma.video.update({
            where: { id: data.videoId },
            data: { error: `Attempt ${job.attempts} failed: ${message}. Retrying.` },
          });
        }
      }
      if (data.publicationId && outcome === "final") {
        const publication = await prisma.publication.update({
          where: { id: data.publicationId },
          data: { status: "FAILED", error: message },
        });
        await prisma.video.update({
          where: { id: publication.videoId },
          data: { status: "APPROVED", error: message },
        });
      }
      console.error(`[worker] ${job.type} ${outcome}: ${message}`);
    }
  }
}

async function main() {
  await bootstrap();
  const recovered = await recoverStale();
  if (recovered) console.log(`[worker] Requeued ${recovered} stale job(s).`);
  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      await runSchedulerTick();
    } catch (error) {
      console.error("[scheduler]", error instanceof Error ? error.message : error);
    } finally {
      ticking = false;
    }
  };
  await tick();
  cron.schedule("* * * * *", () => {
    void tick();
  });
  const concurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 1));
  console.log(`[worker] Ready. Concurrency ${concurrency}.`);
  await Promise.all(Array.from({ length: concurrency }, () => loop()));
}

process.on("SIGINT", () => {
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
