import { z } from "zod";

export const captionStyleSchema = z.object({
  preset: z.enum(["bold-pop", "karaoke", "minimal", "horror"]),
  font: z.string().min(1),
  size: z.number().min(28).max(140),
  color: z.string().min(1),
  highlightColor: z.string().min(1),
  strokeWidth: z.number().min(0).max(24),
  strokeColor: z.string().min(1),
  position: z.enum(["top", "middle", "lower-third"]),
  uppercase: z.boolean(),
  wordsPerLine: z.number().int().min(1).max(4),
});

export type CaptionStyle = z.infer<typeof captionStyleSchema>;

export const CAPTION_FONTS = ["Anton", "Montserrat ExtraBold", "Bangers"] as const;

export const CAPTION_PRESETS: Record<CaptionStyle["preset"], CaptionStyle> = {
  "bold-pop": {
    preset: "bold-pop",
    font: "Anton",
    size: 84,
    color: "#FFFFFF",
    highlightColor: "#FFE14A",
    strokeWidth: 10,
    strokeColor: "#111111",
    position: "lower-third",
    uppercase: true,
    wordsPerLine: 3,
  },
  karaoke: {
    preset: "karaoke",
    font: "Montserrat ExtraBold",
    size: 64,
    color: "#FFFFFF",
    highlightColor: "#FF4D1C",
    strokeWidth: 0,
    strokeColor: "#000000",
    position: "lower-third",
    uppercase: true,
    wordsPerLine: 4,
  },
  minimal: {
    preset: "minimal",
    font: "Montserrat ExtraBold",
    size: 48,
    color: "#F4EFE6",
    highlightColor: "#FFFFFF",
    strokeWidth: 0,
    strokeColor: "#000000",
    position: "lower-third",
    uppercase: false,
    wordsPerLine: 4,
  },
  horror: {
    preset: "horror",
    font: "Bangers",
    size: 78,
    color: "#F4EFE6",
    highlightColor: "#FF2A2A",
    strokeWidth: 2,
    strokeColor: "#2A0000",
    position: "middle",
    uppercase: true,
    wordsPerLine: 2,
  },
};

export function defaultCaptionStyle(): CaptionStyle {
  return { ...CAPTION_PRESETS["bold-pop"] };
}
