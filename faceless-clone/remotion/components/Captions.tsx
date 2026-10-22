import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelCaptionStyle, ReelPage } from "../types";

export function Captions({ pages, style }: { pages: ReelPage[]; style: ReelCaptionStyle }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const page = pages.find((item) => ms >= item.startMs && ms < item.endMs);
  if (!page) return null;
  const top = style.position === "top" ? "12%" : style.position === "middle" ? "46%" : "70%";
  const jitter = style.preset === "horror" ? (random(`cap-${frame}`) - 0.5) * 6 : 0;
  const display = (word: string) => (style.uppercase ? word.toUpperCase() : word.toLowerCase());

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top,
          transform: `translateY(${jitter}px)`,
          textAlign: "center",
          fontFamily: style.font === "Montserrat ExtraBold" ? "Montserrat ExtraBold" : style.font,
          fontSize: style.size,
          lineHeight: 1.05,
          color: style.color,
          WebkitTextStroke: style.strokeWidth ? `${style.strokeWidth}px ${style.strokeColor}` : undefined,
          paintOrder: "stroke fill",
          textShadow: style.preset === "minimal" ? "0 2px 12px rgba(0,0,0,0.55)" : undefined,
        }}
      >
        {page.words.map((word, index) => {
          const active = ms >= word.startMs && ms < word.endMs;
          const age = (ms - word.startMs) / (1000 / fps);
          const scale = active ? interpolate(Math.max(0, age), [0, 4], [1, 1.15], { extrapolateRight: "clamp" }) : 1;
          return (
            <span
              key={`${word.word}-${index}`}
              style={{
                display: "inline-block",
                margin: "0 10px",
                color: active ? style.highlightColor : style.color,
                transform: `scale(${scale})`,
              }}
            >
              {display(word.word)}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
