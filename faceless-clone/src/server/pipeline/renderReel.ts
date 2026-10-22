import fs from "fs/promises";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { ReelProps } from "../../../remotion/types";
import { browserExecutable } from "../media";
import { ensureDir } from "../paths";

let bundled: Promise<string> | null = null;

function serveUrl() {
  if (!bundled) {
    bundled = bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
      publicDir: path.join(process.cwd(), "public"),
      // Keep the bundle pointed at public/ so scene files staged per video are visible.
      symlinkPublicDir: true,
    });
  }
  return bundled;
}

export async function renderReel(props: ReelProps, outputFile: string, thumbFile: string, onProgress?: (ratio: number) => void) {
  const publicDir = path.join(process.cwd(), "public", "_render", path.basename(path.dirname(outputFile)));
  await ensureDir(publicDir);
  const location = await serveUrl();
  const composition = await selectComposition({
    serveUrl: location,
    id: "Reel",
    inputProps: props,
    browserExecutable: browserExecutable() || null,
  });
  const threads = 1;
  await renderMedia({
    composition,
    serveUrl: location,
    codec: "h264",
    outputLocation: outputFile,
    inputProps: props,
    crf: 18,
    x264Preset: "veryfast",
    pixelFormat: "yuv420p",
    audioCodec: "aac",
    concurrency: threads,
    overwrite: true,
    browserExecutable: browserExecutable() || null,
    chromiumOptions: { gl: "swiftshader" },
    onProgress: ({ progress }) => onProgress?.(progress),
  });
  const stillFrame = Math.min(composition.durationInFrames - 1, Math.round(1.2 * composition.fps));
  await renderStill({
    composition,
    serveUrl: location,
    inputProps: props,
    output: thumbFile,
    frame: stillFrame,
    imageFormat: "jpeg",
    browserExecutable: browserExecutable() || null,
    chromiumOptions: { gl: "swiftshader" },
  });
  await fs.rm(publicDir, { recursive: true, force: true }).catch(() => undefined);
}

export async function stagePublicAsset(videoId: string, source: string, name: string) {
  const destDir = path.join(process.cwd(), "public", "_render", videoId);
  await ensureDir(destDir);
  const dest = path.join(destDir, name);
  await fs.copyFile(source, dest);
  return `_render/${videoId}/${name}`;
}
