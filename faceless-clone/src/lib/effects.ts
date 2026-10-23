export type EffectDef = {
  key: string;
  label: string;
  description: string;
};

export const EFFECTS: EffectDef[] = [
  {
    key: "glitch",
    label: "Glitch effect",
    description:
      "Glitches the subject with chromatic distortion and eerie shake — perfect for horror, thrillers, and scary content",
  },
  {
    key: "film-grain",
    label: "Film grain",
    description: "A fine moving grain over the picture, like a scanned print.",
  },
  {
    key: "vignette",
    label: "Vignette",
    description: "Darkens the corners so the eye stays on the center of the frame.",
  },
  {
    key: "zoom-pulse",
    label: "Zoom pulse",
    description: "A small rhythmic zoom that pushes on each scene cut.",
  },
  {
    key: "shake",
    label: "Camera shake",
    description: "A light handheld tremble between the harder glitch bursts.",
  },
];

export function effectByKey(key: string) {
  return EFFECTS.find((effect) => effect.key === key);
}
