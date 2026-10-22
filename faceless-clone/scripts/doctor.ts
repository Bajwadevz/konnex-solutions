import "dotenv/config";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const checks: { name: string; ok: boolean; detail: string }[] = [];

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "ok" : "!!"}  ${name}: ${detail}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
add("node", nodeMajor >= 20, process.version);

for (const bin of ["ffmpeg", "ffprobe"]) {
  const found = spawnSync("which", [bin], { encoding: "utf8" });
  add(bin, found.status === 0, found.stdout.trim() || "not on PATH");
}

const chrome = process.env.REMOTION_BROWSER_EXECUTABLE || "/usr/local/bin/google-chrome";
add("chrome", existsSync(chrome), chrome);

add("env", existsSync(".env"), existsSync(".env") ? ".env present" : "copy .env.example to .env");
const secret = process.env.APP_SECRET || "";
add("APP_SECRET", secret.length >= 16 && secret !== "change-me-to-a-long-random-string", secret ? "set" : "missing");

for (const font of ["public/fonts/anton.woff", "public/fonts/montserrat-extrabold.woff", "public/fonts/bangers.woff"]) {
  add(font, existsSync(font), existsSync(font) ? "found" : "missing caption font");
}

const music = ["creepy-melody", "horror-piano", "unsolved-mystery", "8bit-slowed", "quiet-before-storm", "brilliant-symphony"];
for (const key of music) {
  const file = `assets/music/${key}.mp3`;
  add(file, existsSync(file), existsSync(file) ? "playable stand-in" : `add ${file}`);
}

async function checkDatabase() {
  try {
    const prisma = new PrismaClient();
    const voices = await prisma.voice.count();
    add("database", true, `${voices} voices`);
    add("voice catalog", voices === 60, `${voices} of 60`);
    await prisma.$disconnect();
  } catch (error) {
    add("database", false, error instanceof Error ? error.message : "unavailable — run npm run db:setup");
  }
}

const script = process.env.SCRIPT_PROVIDER || "anthropic";
const image = process.env.IMAGE_PROVIDER || "comfyui";
const tts = process.env.TTS_PROVIDER || "edge";
add("script provider", true, script);
add("image provider", true, image);
add("tts provider", true, tts);
add("publish dry run", true, process.env.PUBLISH_DRY_RUN || "true");
const whisper = process.env.WHISPER_CPP_PATH || "whisper-cli";
const whisperFound = spawnSync("which", [whisper], { encoding: "utf8" });
add("whisper", whisperFound.status === 0, whisperFound.status === 0 ? whisper : "optional — captions fall back to voice timings");

checkDatabase()
  .then(() => {
    const failed = checks.filter((check) => !check.ok && !["whisper", ...music.map((key) => `assets/music/${key}.mp3`)].includes(check.name));
    process.exit(failed.length ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
