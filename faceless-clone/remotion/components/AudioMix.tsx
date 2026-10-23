import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";

export function AudioMix({ voiceSrc, musicSrc }: { voiceSrc: string; musicSrc: string | null }) {
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      {voiceSrc ? <Audio src={staticFile(voiceSrc)} volume={1} /> : null}
      {musicSrc ? (
        <Audio
          src={staticFile(musicSrc)}
          loop
          volume={(frame) => {
            const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const fadeOut = interpolate(frame, [durationInFrames - 45, durationInFrames - 1], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const ducked = voiceSrc ? 0.063 : 0.126;
            return ducked * fadeIn * fadeOut;
          }}
        />
      ) : null}
    </>
  );
}
