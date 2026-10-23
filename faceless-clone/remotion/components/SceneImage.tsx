import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import type { ReelScene } from "../types";
import { GlitchLayer } from "./GlitchLayer";

export function SceneImage({
  scene,
  index,
  effects,
  seed,
}: {
  scene: ReelScene;
  index: number;
  effects: string[];
  seed: number;
}) {
  const frame = useCurrentFrame();
  const fade = 6;
  if (frame < scene.startFrame || frame >= scene.endFrame) return null;
  const span = Math.max(1, scene.endFrame - scene.startFrame);
  const progress = Math.min(1, Math.max(0, (frame - scene.startFrame) / span));
  const local = frame - scene.startFrame;
  let scale = 1;
  let x = 0;
  let y = 0;
  if (scene.kenBurns === "zoom-in") scale = interpolate(progress, [0, 1], [1, 1.14]);
  if (scene.kenBurns === "zoom-out") scale = interpolate(progress, [0, 1], [1.14, 1]);
  if (scene.kenBurns === "pan-left") {
    scale = 1.12;
    x = interpolate(progress, [0, 1], [36, -36]);
  }
  if (scene.kenBurns === "pan-right") {
    scale = 1.12;
    x = interpolate(progress, [0, 1], [-36, 36]);
  }
  if (effects.includes("zoom-pulse")) scale *= 1 + Math.sin(frame / 8) * 0.015;
  if (index > 0 && local < 4) scale *= 1.035;
  if (effects.includes("shake")) {
    x += (random(`shake-x-${seed}-${frame}`) - 0.5) * 3;
    y += (random(`shake-y-${seed}-${frame}`) - 0.5) * 3;
  }
  const opacity = index > 0 && local < fade ? local / fade : 1;
  const src = staticFile(scene.src);
  const sceneCut = index > 0 && local < 6;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {effects.includes("glitch") ? <GlitchLayer src={src} seed={seed + index * 17} frame={frame} sceneCut={sceneCut} /> : null}
      </AbsoluteFill>
      {effects.includes("film-grain") ? (
        <AbsoluteFill
          style={{
            opacity: 0.18,
            backgroundImage:
              "repeating-radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0 0.5px, transparent 0.6px 3px)",
            mixBlendMode: "overlay",
          }}
        />
      ) : null}
      {effects.includes("vignette") ? (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
