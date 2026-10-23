import { spawn } from "child_process";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().slice(-500) || `${command} failed`));
    });
  });
}

export function probeDuration(file: string) {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(file, (error, data) => {
      if (error) reject(error);
      else resolve(Number(data.format.duration ?? 0));
    });
  });
}

export async function loudnormToMp3(input: string, output: string) {
  const temp = `${output}.norm.mp3`;
  await new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .audioFilters("loudnorm=I=-16:TP=-1.5:LRA=11")
      .audioBitrate("192k")
      .format("mp3")
      .on("end", () => resolve())
      .on("error", reject)
      .save(temp);
  });
  await fs.rename(temp, output);
}

export async function changeTempo(input: string, output: string, tempo: number) {
  const safe = Math.min(2, Math.max(0.5, tempo));
  await new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .audioFilters(`atempo=${safe.toFixed(3)}`)
      .audioBitrate("192k")
      .format("mp3")
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
}

export async function transcodeToMp3(input: string, output: string) {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(input).audioBitrate("192k").format("mp3").on("end", () => resolve()).on("error", reject).save(output);
  });
}

export async function espeakToMp3(text: string, output: string) {
  const wav = `${output}.wav`;
  await run("espeak-ng", ["-v", "en", "-s", "150", "-w", wav, text]);
  await transcodeToMp3(wav, output);
  await fs.rm(wav, { force: true });
}

export function browserExecutable() {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE || "",
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

export async function directorySize(dir: string) {
  let total = 0;
  async function walk(current: string) {
    let entries: { name: string; isDirectory: () => boolean }[] = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(next);
      else {
        try {
          total += (await fs.stat(next)).size;
        } catch {
          /* skip races */
        }
      }
    }
  }
  await walk(dir);
  return total;
}
