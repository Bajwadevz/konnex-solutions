import { Composition } from "remotion";
import { ReelComposition } from "./compositions/ReelComposition";
import { defaultReelProps, type ReelProps } from "./types";

export function RemotionRoot() {
  return (
    <Composition
      id="Reel"
      component={ReelComposition}
      durationInFrames={defaultReelProps.durationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultReelProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(30, (props as ReelProps).durationInFrames || 90),
      })}
    />
  );
};
