import { AbsoluteFill, Img, random } from "remotion";

export function GlitchLayer({
  src,
  seed,
  frame,
  sceneCut,
}: {
  src: string;
  seed: number;
  frame: number;
  sceneCut: boolean;
}) {
  const bucket = Math.floor(frame / 22);
  const gate = random(`gate-${seed}-${bucket}`);
  const start = bucket * 22 + Math.floor(random(`start-${seed}-${bucket}`) * 8);
  const length = 4 + Math.floor(random(`len-${seed}-${bucket}`) * 5);
  const bursting = sceneCut || (gate > 0.7 && frame >= start && frame < start + length);
  const split = bursting ? 6 + random(`split-${seed}-${frame}`) * 14 : 1.2;
  const jitter = bursting ? 0 : (random(`idle-${seed}-${frame}`) - 0.5) * 3;
  const shake = bursting ? (random(`sk-${seed}-${frame}`) - 0.5) * 8 : jitter;
  const slices = bursting ? 3 + Math.floor(random(`slices-${seed}-${frame}`) * 4) : 0;

  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${jitter}px)` }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={`red-${seed}`}>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id={`green-${seed}`}>
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id={`blue-${seed}`}>
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      {(
        [
          { channel: "red", offset: -split },
          { channel: "green", offset: 0 },
          { channel: "blue", offset: split },
        ] as const
      ).map(({ channel, offset }) => (
        <AbsoluteFill key={channel} style={{ mixBlendMode: "screen", transform: `translateX(${offset}px)`, opacity: bursting ? 0.95 : 0.55 }}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `url(#${channel}-${seed})` }} />
        </AbsoluteFill>
      ))}
      {Array.from({ length: slices }, (_, index) => {
        const shift = (random(`slice-${seed}-${frame}-${index}`) - 0.5) * 48;
        const top = (100 / slices) * index;
        const bottom = 100 - (100 / slices) * (index + 1);
        return (
          <AbsoluteFill key={index} style={{ clipPath: `inset(${top}% 0 ${bottom}% 0)`, transform: `translateX(${shift}px)` }}>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        );
      })}
      {bursting ? (
        <AbsoluteFill
          style={{
            opacity: 0.35,
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.35) 0 1px, transparent 1px 4px)",
            mixBlendMode: "overlay",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
