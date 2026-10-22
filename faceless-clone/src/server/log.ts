import fs from "fs/promises";
import path from "path";
import { ensureDir, storageRoot } from "./paths";

export async function videoLog(videoId: string, message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  const dir = path.join(storageRoot(), "logs");
  await ensureDir(dir);
  await fs.appendFile(path.join(dir, `${videoId}.log`), line);
  console.log(`[video ${videoId}] ${message}`);
}

export async function publishLog(message: string) {
  const dir = path.join(storageRoot(), "logs");
  await ensureDir(dir);
  await fs.appendFile(path.join(dir, "publish.log"), `[${new Date().toISOString()}] ${message}\n`);
  console.log(`[publish] ${message}`);
}

export async function readVideoLog(videoId: string, maxLines = 200) {
  try {
    const text = await fs.readFile(path.join(storageRoot(), "logs", `${videoId}.log`), "utf8");
    return text.trim().split("\n").slice(-maxLines).join("\n");
  } catch {
    return "";
  }
}
