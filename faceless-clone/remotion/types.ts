export type KenBurns = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export type ReelScene = {
  src: string;
  startFrame: number;
  endFrame: number;
  kenBurns: KenBurns;
};

export type ReelWord = { word: string; startMs: number; endMs: number };

export type ReelPage = {
  text: string;
  startMs: number;
  endMs: number;
  words: ReelWord[];
};

export type ReelCaptionStyle = {
  preset: "bold-pop" | "karaoke" | "minimal" | "horror";
  font: string;
  size: number;
  color: string;
  highlightColor: string;
  strokeWidth: number;
  strokeColor: string;
  position: "top" | "middle" | "lower-third";
  uppercase: boolean;
  wordsPerLine: number;
};

export type ReelProps = {
  scenes: ReelScene[];
  pages: ReelPage[];
  captionStyle: ReelCaptionStyle;
  voiceSrc: string;
  musicSrc: string | null;
  effects: string[];
  seed: number;
  durationInFrames: number;
};

export const defaultReelProps: ReelProps = {
  scenes: [],
  pages: [],
  captionStyle: {
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
  voiceSrc: "",
  musicSrc: null,
  effects: [],
  seed: 1,
  durationInFrames: 90,
};
