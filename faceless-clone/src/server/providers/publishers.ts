import fs from "fs/promises";
import { publishLog } from "../log";

export type PublishInput = {
  videoPath: string;
  title: string;
  description: string;
  hashtags: string[];
  accessToken: string;
  pageId?: string;
  videoId: string;
};

function dryRun() {
  return (process.env.PUBLISH_DRY_RUN || "true").toLowerCase() !== "false";
}

function caption(input: PublishInput) {
  const tags = input.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
  return `${input.description}\n\n${tags}`.trim();
}

export async function publishYouTube(input: PublishInput) {
  const title = input.title.includes("#Shorts") ? input.title : `${input.title} #Shorts`.slice(0, 100);
  const description = `${caption(input)}\n#Shorts`;
  if (dryRun()) {
    await publishLog(`DRY RUN youtube video=${input.videoId} title=${JSON.stringify(title)} synthetic=true`);
    return { externalId: `dry-run-youtube-${input.videoId}`, url: undefined as string | undefined };
  }
  const meta = {
    snippet: { title, description, categoryId: "22" },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  const stat = await fs.stat(input.videoPath);
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify(meta),
  });
  if (!start.ok) throw new Error(`YouTube refused the upload session (${start.status}). Unaudited apps often force private videos or test users only.`);
  const location = start.headers.get("location");
  if (!location) throw new Error("YouTube did not return an upload URL.");
  const bytes = await fs.readFile(input.videoPath);
  const uploaded = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) },
    body: bytes,
  });
  if (!uploaded.ok) throw new Error(`YouTube upload failed (${uploaded.status}).`);
  const body = (await uploaded.json()) as { id?: string };
  if (!body.id) throw new Error("YouTube did not return a video id.");
  return { externalId: body.id, url: `https://www.youtube.com/shorts/${body.id}` };
}

export async function publishTikTok(input: PublishInput) {
  const title = `${input.title} ${input.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`.trim().slice(0, 150);
  if (dryRun()) {
    await publishLog(`DRY RUN tiktok video=${input.videoId} title=${JSON.stringify(title)} privacy=SELF_ONLY is_aigc=true`);
    return { externalId: `dry-run-tiktok-${input.videoId}`, url: undefined as string | undefined };
  }
  const stat = await fs.stat(input.videoPath);
  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1200,
        is_aigc: true,
      },
      source_info: { source: "FILE_UPLOAD", video_size: stat.size, chunk_size: stat.size, total_chunk_count: 1 },
    }),
  });
  if (!init.ok) throw new Error(`TikTok init failed (${init.status}). Sandbox posts stay private until the app is audited.`);
  const body = (await init.json()) as { data?: { upload_url?: string; publish_id?: string }; error?: { message?: string } };
  if (!body.data?.upload_url || !body.data.publish_id) throw new Error(body.error?.message || "TikTok did not return an upload URL.");
  const bytes = await fs.readFile(input.videoPath);
  const put = await fetch(body.data.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` },
    body: bytes,
  });
  if (!put.ok) throw new Error(`TikTok file upload failed (${put.status}).`);
  return { externalId: body.data.publish_id, url: undefined };
}

export async function publishInstagram(input: PublishInput) {
  const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("Instagram needs PUBLIC_BASE_URL. Meta cannot download a video from localhost.");
  const videoUrl = `${base}/api/videos/${input.videoId}/file`;
  const igCaption = `${caption(input)}\n\nMade with AI.`;
  if (dryRun()) {
    await publishLog(`DRY RUN instagram video=${input.videoId} url=${videoUrl}`);
    return { externalId: `dry-run-instagram-${input.videoId}`, url: undefined as string | undefined };
  }
  if (!input.pageId) throw new Error("This Instagram account has no linked Facebook Page id. Reconnect it.");
  const create = await fetch(`https://graph.facebook.com/v19.0/${input.pageId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption: igCaption,
      access_token: input.accessToken,
    }),
  });
  if (!create.ok) throw new Error(`Instagram container failed (${create.status}). The video URL must be publicly reachable.`);
  const created = (await create.json()) as { id?: string };
  if (!created.id) throw new Error("Instagram did not return a media container.");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await fetch(`https://graph.facebook.com/v19.0/${created.id}?fields=status_code&access_token=${encodeURIComponent(input.accessToken)}`);
    const state = (await status.json()) as { status_code?: string };
    if (state.status_code === "FINISHED") break;
    if (state.status_code === "ERROR") throw new Error("Instagram could not process the video.");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  const published = await fetch(`https://graph.facebook.com/v19.0/${input.pageId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: created.id, access_token: input.accessToken }),
  });
  if (!published.ok) throw new Error(`Instagram publish failed (${published.status}).`);
  const result = (await published.json()) as { id?: string };
  return { externalId: result.id || created.id, url: result.id ? `https://www.instagram.com/reel/${result.id}` : undefined };
}
