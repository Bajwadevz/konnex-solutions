export type WordTiming = {
  word: string;
  startMs: number;
  endMs: number;
};

export type CaptionPage = {
  text: string;
  startMs: number;
  endMs: number;
  words: WordTiming[];
};

const BREAK = /[.,!?;:—–-]$/;

export function groupCaptions(words: WordTiming[], wordsPerLine: number): CaptionPage[] {
  const size = Math.min(4, Math.max(1, Math.round(wordsPerLine)));
  const pages: CaptionPage[] = [];
  let bucket: WordTiming[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    const text = bucket.map((word) => word.word).join(" ");
    pages.push({
      text,
      startMs: bucket[0]!.startMs,
      endMs: bucket[bucket.length - 1]!.endMs,
      words: bucket,
    });
    bucket = [];
  };

  for (const word of words) {
    bucket.push(word);
    const punct = BREAK.test(word.word);
    if (bucket.length >= size || (punct && bucket.length >= 1 && bucket.length < size)) flush();
  }
  flush();
  return pages;
}

export function estimateTimings(text: string, durationMs: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationMs <= 0) return [];
  const weight = words.reduce((sum, word) => sum + Math.max(1, word.length), 0);
  let cursor = 0;
  return words.map((word) => {
    const share = (Math.max(1, word.length) / weight) * durationMs;
    const startMs = cursor;
    cursor += share;
    return { word, startMs, endMs: cursor };
  });
}

export function alignScenes(
  scenes: { narration: string }[],
  words: WordTiming[],
  durationMs: number,
): { startMs: number; endMs: number }[] {
  const counts = scenes.map((scene) => scene.narration.split(/\s+/).filter(Boolean).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (words.length === 0 || total === 0) {
    const slice = durationMs / Math.max(1, scenes.length);
    return scenes.map((_, index) => ({
      startMs: index * slice,
      endMs: index === scenes.length - 1 ? durationMs : (index + 1) * slice,
    }));
  }

  if (words.length === total) {
    let index = 0;
    return counts.map((count, sceneIndex) => {
      const slice = words.slice(index, index + count);
      index += count;
      const startMs = slice[0]?.startMs ?? 0;
      const endMs =
        sceneIndex === counts.length - 1
          ? (words[words.length - 1]?.endMs ?? durationMs)
          : (slice[slice.length - 1]?.endMs ?? startMs);
      return { startMs, endMs };
    });
  }

  let index = 0;
  return counts.map((count, sceneIndex) => {
    const share = count / total;
    const take = sceneIndex === counts.length - 1 ? words.length - index : Math.max(1, Math.round(share * words.length));
    const slice = words.slice(index, Math.min(words.length, index + take));
    index += take;
    const startMs = slice[0]?.startMs ?? 0;
    const endMs =
      sceneIndex === counts.length - 1
        ? (words[words.length - 1]?.endMs ?? durationMs)
        : (slice[slice.length - 1]?.endMs ?? startMs);
    return { startMs, endMs: Math.max(endMs, startMs + 200) };
  });
}
