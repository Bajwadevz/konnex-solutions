import fs from "fs/promises";
import { parseJson } from "../../lib/utils";
import { decryptSecret, encryptSecret } from "../crypto";
import { prisma } from "../db";
import { publishLog, videoLog } from "../log";
import { safeProjectFile } from "../paths";
import { publishInstagram, publishTikTok, publishYouTube } from "../providers/publishers";

async function refreshIfNeeded(accountId: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("That social account was disconnected.");
  if (!account.expiresAt || account.expiresAt.getTime() > Date.now() + 60_000) return account;
  if (!account.refreshToken) {
    throw new Error(`${account.displayName} needs to be reconnected.`);
  }
  const refresh = decryptSecret(account.refreshToken);
  let next: { accessToken: string; refreshToken?: string; expiresAt?: Date } | null = null;
  if (account.platform === "youtube") {
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refresh,
      grant_type: "refresh_token",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error(`${account.displayName} needs to be reconnected.`);
    const token = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!token.access_token) throw new Error(`${account.displayName} needs to be reconnected.`);
    next = { accessToken: token.access_token, expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000) };
  }
  if (!next) return account;
  return prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptSecret(next.accessToken),
      expiresAt: next.expiresAt,
    },
  });
}

export async function publishVideo(publicationId: string) {
  const publication = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: { video: true, },
  });
  if (!publication) throw new Error("Publication no longer exists.");
  const account = await refreshIfNeeded(publication.accountId);
  if (!publication.video.filePath) throw new Error("The video file is not ready yet.");
  const file = safeProjectFile(publication.video.filePath);
  await fs.access(file);
  const input = {
    videoPath: file,
    title: publication.video.title || "Faceless short",
    description: publication.video.description || "",
    hashtags: parseJson<string[]>(publication.video.hashtags, []),
    accessToken: (process.env.PUBLISH_DRY_RUN || "true").toLowerCase() === "false" ? decryptSecret(account.accessToken) : "",
    pageId: parseJson<{ pageId?: string }>(account.meta, {}).pageId,
    videoId: publication.videoId,
  };
  const result =
    publication.platform === "youtube" ? await publishYouTube(input)
    : publication.platform === "tiktok" ? await publishTikTok(input)
    : await publishInstagram(input);
  await prisma.publication.update({
    where: { id: publication.id },
    data: { status: "PUBLISHED", externalId: result.externalId, url: result.url, error: null },
  });
  const siblings = await prisma.publication.findMany({ where: { videoId: publication.videoId } });
  if (siblings.every((item) => item.status === "PUBLISHED")) {
    await prisma.video.update({ where: { id: publication.videoId }, data: { status: "PUBLISHED", error: null } });
  }
  await videoLog(publication.videoId, `Published to ${publication.platform}: ${result.externalId}`);
  await publishLog(`${publication.platform} ${publication.videoId} -> ${result.externalId}`);
}
