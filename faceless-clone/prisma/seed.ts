import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { VOICE_CATALOG } from "../src/lib/voiceCatalog";

const prisma = new PrismaClient();

const PRESETS = [
  ["creepy-melody", "Creepy melody", "Haunting and unsettling melody"],
  ["horror-piano", "Horror piano", "Dark and chilling piano keys"],
  ["unsolved-mystery", "Unsolved mystery", "Suspenseful and intriguing atmosphere"],
  ["8bit-slowed", "8-bit slowed", "Eerie chiptune with a haunting retro feel"],
  ["quiet-before-storm", "Quiet before storm", "Building tension and anticipation for dramatic reveals"],
  ["brilliant-symphony", "Brilliant symphony", "Orchestral and majestic for epic storytelling"],
] as const;

export async function seedAll() {
  for (const voice of VOICE_CATALOG) {
    await prisma.voice.upsert({
      where: { id: voice.id },
      update: voice,
      create: voice,
    });
  }
  for (const [key, name, description] of PRESETS) {
    await prisma.musicTrack.upsert({
      where: { key },
      update: { name, description, filePath: `assets/music/${key}.mp3`, isPreset: true },
      create: { key, name, description, filePath: `assets/music/${key}.mp3`, isPreset: true },
    });
  }
  await prisma.setting.upsert({
    where: { key: "timezone" },
    update: {},
    create: { key: "timezone", value: "UTC" },
  });
}

if (process.argv[1]?.includes("seed")) {
  seedAll()
    .then(async () => {
      const voices = await prisma.voice.count();
      console.log(`Seeded ${voices} voices and 6 music presets.`);
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
