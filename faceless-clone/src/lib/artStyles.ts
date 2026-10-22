export type ArtStyle = {
  key: string;
  label: string;
  promptSuffix: string;
  palette: [string, string, string];
};

export const ART_STYLES: ArtStyle[] = [
  {
    key: "comic",
    label: "Comic",
    promptSuffix: "bold ink outlines, halftone shading, vibrant flat colors, western comic book panel art",
    palette: ["#f2c14e", "#e4572e", "#1b3a4b"],
  },
  {
    key: "creepy-comic",
    label: "Creepy Comic",
    promptSuffix:
      "dark gritty comic art, heavy black ink, desaturated palette with sickly green and blood red accents, horror graphic novel",
    palette: ["#1a1f16", "#6b8f71", "#8c2f39"],
  },
  {
    key: "modern-cartoon",
    label: "Modern Cartoon",
    promptSuffix:
      "clean vector cartoon, thick uniform outlines, bright saturated colors, expressive characters, modern animated series look",
    palette: ["#ffd23f", "#3bceac", "#540d6e"],
  },
  {
    key: "disney",
    label: "Disney",
    promptSuffix:
      "classic 3D family animated film look, soft lighting, big expressive eyes, warm storybook colors, polished and whimsical",
    palette: ["#f6d6ad", "#e88d67", "#7ebdc2"],
  },
  {
    key: "mythology",
    label: "Mythology",
    promptSuffix:
      "ancient greek vase painting meets epic oil painting, golden light, marble and bronze textures, dramatic composition",
    palette: ["#c4a35a", "#f3e9d2", "#3e2f1c"],
  },
  {
    key: "pixel-art",
    label: "Pixel Art",
    promptSuffix: "16-bit pixel art, limited color palette, crisp pixels, retro video game scene",
    palette: ["#2d1b2e", "#c73e66", "#f2d06b"],
  },
  {
    key: "ghibli",
    label: "Ghibli",
    promptSuffix:
      "hand-painted anime watercolor backgrounds, soft natural light, lush detail, gentle nostalgic pastoral mood",
    palette: ["#d7e8c7", "#8fbf9f", "#f4e1c1"],
  },
  {
    key: "anime",
    label: "Anime",
    promptSuffix: "high-quality anime key visual, dynamic angles, cel shading, vivid colors, dramatic lighting",
    palette: ["#1b1b3a", "#ff4d6d", "#4cc9f0"],
  },
  {
    key: "painting",
    label: "Painting",
    promptSuffix: "classical oil painting, visible brush strokes, rich chiaroscuro lighting, museum-quality",
    palette: ["#2c1810", "#c68642", "#efe6d5"],
  },
  {
    key: "dark-fantasy",
    label: "Dark Fantasy",
    promptSuffix: "grimdark fantasy concept art, moody fog, dramatic rim light, ornate detail, ominous atmosphere",
    palette: ["#0e1116", "#6d597a", "#e0a96d"],
  },
  {
    key: "lego",
    label: "Lego",
    promptSuffix: "toy brick minifigure diorama, plastic brick textures, macro photography, shallow depth of field",
    palette: ["#ffe14a", "#e3000b", "#0055bf"],
  },
  {
    key: "polaroid",
    label: "Polaroid",
    promptSuffix: "vintage instant photo, faded colors, soft flash, film grain, white border feel, found-photograph look",
    palette: ["#efe6d2", "#d4b483", "#7a6a53"],
  },
  {
    key: "realism",
    label: "Realism",
    promptSuffix: "photorealistic cinematic still, 35mm lens, natural lighting, high detail, shallow depth of field",
    palette: ["#1c1a17", "#8d8478", "#d9cbb6"],
  },
];

export function artStyleByKey(key: string) {
  return ART_STYLES.find((style) => style.key === key) ?? ART_STYLES[0]!;
}
