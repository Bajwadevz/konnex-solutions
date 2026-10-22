export const NEGATIVE_PROMPT =
  "text, letters, watermark, logo, signature, blurry, deformed hands, extra limbs, low quality";

export function assembleImagePrompt(input: {
  imagePrompt: string;
  styleBible: string;
  artSuffix: string;
  nicheAddendum: string;
}) {
  return [
    input.imagePrompt.trim(),
    input.styleBible.trim(),
    input.artSuffix.trim(),
    input.nicheAddendum.trim(),
    "vertical 9:16 composition, no text, no watermark",
  ]
    .filter(Boolean)
    .join(", ");
}
