import { languagesForProvider } from "../lib/languages";

export type ProviderIssue = { provider: string; configured: boolean; missing: string[]; detail: string };

function filled(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function activeProviders() {
  return {
    script: (process.env.SCRIPT_PROVIDER || "anthropic").toLowerCase(),
    image: (process.env.IMAGE_PROVIDER || "comfyui").toLowerCase(),
    tts: (process.env.TTS_PROVIDER || "edge").toLowerCase(),
    dryRun: (process.env.PUBLISH_DRY_RUN || "true").toLowerCase() !== "false",
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 1),
    imageConcurrency: Number(process.env.IMAGE_CONCURRENCY || 2),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
    whisperModel: process.env.WHISPER_MODEL || "base.en",
  };
}

export function providerStatus(): ProviderIssue[] {
  const active = activeProviders();
  const scriptMissing =
    active.script === "anthropic" ? (filled("ANTHROPIC_API_KEY") ? [] : ["ANTHROPIC_API_KEY"])
    : active.script === "openai" ? (filled("OPENAI_API_KEY") ? [] : ["OPENAI_API_KEY"])
    : [];
  const imageMissing =
    active.image === "fal" ? (filled("FAL_KEY") ? [] : ["FAL_KEY"])
    : active.image === "replicate" ? (filled("REPLICATE_API_TOKEN") ? [] : ["REPLICATE_API_TOKEN"])
    : active.image === "openai" ? (filled("OPENAI_API_KEY") ? [] : ["OPENAI_API_KEY"])
    : [];
  const ttsMissing =
    active.tts === "elevenlabs" ? (filled("ELEVENLABS_API_KEY") ? [] : ["ELEVENLABS_API_KEY"]) : [];
  const languages = languagesForProvider(active.tts).map((language) => language.code).join(", ");
  return [
    {
      provider: "script",
      configured: scriptMissing.length === 0,
      missing: scriptMissing,
      detail:
        active.script === "builtin"
          ? "Builtin writer is active. No API key. Swap SCRIPT_PROVIDER to anthropic, openai, or ollama when you want a model."
          : `Active script provider: ${active.script}.`,
    },
    {
      provider: "image",
      configured: imageMissing.length === 0,
      missing: imageMissing,
      detail:
        active.image === "placeholder"
          ? "Placeholder images are active so videos render without a GPU. Set IMAGE_PROVIDER to comfyui, a1111, fal, replicate, or openai for real pictures."
          : `Active image provider: ${active.image}.`,
    },
    {
      provider: "tts",
      configured: ttsMissing.length === 0,
      missing: ttsMissing,
      detail: `Active voice provider: ${active.tts}. Languages: ${languages}.`,
    },
    {
      provider: "captions",
      configured: true,
      missing: [],
      detail: "Uses word timings from the voice provider when they exist. Whisper.cpp runs only if its binary is installed.",
    },
  ];
}

export function socialStatus() {
  const active = activeProviders();
  return {
    dryRun: active.dryRun,
    youtube: {
      configured: filled("GOOGLE_CLIENT_ID") && filled("GOOGLE_CLIENT_SECRET"),
      missing: [!filled("GOOGLE_CLIENT_ID") ? "GOOGLE_CLIENT_ID" : "", !filled("GOOGLE_CLIENT_SECRET") ? "GOOGLE_CLIENT_SECRET" : ""].filter(Boolean),
      note: "Unverified Google apps can only upload as test users, and unaudited projects may force private videos. Shorts are vertical videos with #Shorts.",
    },
    tiktok: {
      configured: filled("TIKTOK_CLIENT_KEY") && filled("TIKTOK_CLIENT_SECRET"),
      missing: [!filled("TIKTOK_CLIENT_KEY") ? "TIKTOK_CLIENT_KEY" : "", !filled("TIKTOK_CLIENT_SECRET") ? "TIKTOK_CLIENT_SECRET" : ""].filter(Boolean),
      note: "Until TikTok audits the app, API posts stay private (SELF_ONLY).",
    },
    instagram: {
      configured: filled("META_APP_ID") && filled("META_APP_SECRET") && Boolean(active.publicBaseUrl),
      missing: [
        !filled("META_APP_ID") ? "META_APP_ID" : "",
        !filled("META_APP_SECRET") ? "META_APP_SECRET" : "",
        !active.publicBaseUrl ? "PUBLIC_BASE_URL" : "",
      ].filter(Boolean),
      note: active.publicBaseUrl
        ? "Instagram needs a Business or Creator account linked to a Facebook Page. The video URL is served from PUBLIC_BASE_URL."
        : "Instagram is off until PUBLIC_BASE_URL points at a public tunnel. Meta cannot fetch localhost.",
    },
  };
}
