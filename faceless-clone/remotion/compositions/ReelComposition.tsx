import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { AudioMix } from "../components/AudioMix";
import { Captions } from "../components/Captions";
import { SceneImage } from "../components/SceneImage";
import type { ReelProps } from "../types";

function FontFaces() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      new FontFace("Anton", `url(${staticFile("fonts/anton.woff")})`),
      new FontFace("Montserrat ExtraBold", `url(${staticFile("fonts/montserrat-extrabold.woff")})`),
      new FontFace("Bangers", `url(${staticFile("fonts/bangers.woff")})`),
    ];
    Promise.all(
      faces.map((face) =>
        face.load().then((loaded) => {
          document.fonts.add(loaded);
        }),
      ),
    )
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
  return null;
}

export function ReelComposition(props: ReelProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#070605" }}>
      <FontFaces />
      {props.scenes.map((scene, index) => (
        <SceneImage key={`${scene.src}-${index}`} scene={scene} index={index} effects={props.effects} seed={props.seed} />
      ))}
      <Captions pages={props.pages} style={props.captionStyle} />
      <AudioMix voiceSrc={props.voiceSrc} musicSrc={props.musicSrc} />
    </AbsoluteFill>
  );
};
