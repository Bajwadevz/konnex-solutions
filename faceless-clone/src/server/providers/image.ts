import sharp from "sharp";
import { artStyleByKey } from "../../lib/artStyles";
import { NEGATIVE_PROMPT } from "../../lib/promptAssembly";
import { hashSeed } from "../../lib/utils";

export class SafetyRejection extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafetyRejection";
  }
}

export type ImageRequest = {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
};

export function imageSizeFor(provider = (process.env.IMAGE_PROVIDER || "comfyui").toLowerCase()) {
  if (provider === "openai") return { width: 1024, height: 1536 };
  if (provider === "fal" || provider === "replicate") return { width: 768, height: 1344 };
  return { width: 1080, height: 1920 };
}

export async function placeholderPng(input: {
  width: number;
  height: number;
  seed: number;
  scene: number;
  palette: [string, string, string];
}) {
  const { width, height, seed, scene, palette } = input;
  const [a, b, c] = palette;
  const x = Math.abs((seed + scene * 173) % width);
  const y = Math.abs((seed * 3 + scene * 91) % height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${a}"/>
        <stop offset="0.5" stop-color="${b}"/>
        <stop offset="1" stop-color="${c}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${x}" cy="${y}" r="${220 + (scene % 4) * 50}" fill="${c}" opacity="0.5"/>
    <rect x="${x % (width - 260)}" y="${Math.round(height * 0.18)}" width="260" height="${Math.round(height * 0.58)}" rx="90" fill="${a}" opacity="0.62"/>
    <path d="M0 ${Math.round(height * 0.74)} C ${Math.round(width * 0.28)} ${Math.round(height * 0.58)}, ${Math.round(width * 0.62)} ${Math.round(height * 0.9)}, ${width} ${Math.round(height * 0.66)} L ${width} ${height} L 0 ${height} Z" fill="#0c0b09" opacity="0.62"/>
    <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.22)}" r="18" fill="#f4efe6" opacity="0.8"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function isSafety(message: string) {
  return /safety|content policy|nsfw|moderation|rejected/i.test(message);
}

async function readImageResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    if (isSafety(text)) throw new SafetyRejection(text.slice(0, 300));
    throw new Error(text.slice(0, 300) || `Image request failed (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function comfy(input: ImageRequest) {
  const base = (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
  const ckpt = process.env.COMFYUI_CHECKPOINT || "v1-5-pruned-emaonly.safetensors";
  const seed = input.seed ?? 1;
  const prompt = {
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: input.width, height: input.height, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: input.prompt, clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: input.negativePrompt || NEGATIVE_PROMPT, clip: ["4", 1] } },
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 20,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "faceless", images: ["8", 0] } },
  };
  const queued = await fetch(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!queued.ok) throw new Error(`ComfyUI rejected the workflow (${queued.status}). Check COMFYUI_CHECKPOINT.`);
  const started = (await queued.json()) as { prompt_id?: string };
  if (!started.prompt_id) throw new Error("ComfyUI did not return a prompt id.");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const history = await fetch(`${base}/history/${started.prompt_id}`);
    if (!history.ok) continue;
    const body = (await history.json()) as Record<string, { outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }> }>;
    const entry = body[started.prompt_id];
    const images = Object.values(entry?.outputs ?? {}).flatMap((output) => output.images ?? []);
    const image = images[0];
    if (!image) continue;
    const view = new URL(`${base}/view`);
    view.searchParams.set("filename", image.filename);
    view.searchParams.set("subfolder", image.subfolder || "");
    view.searchParams.set("type", image.type || "output");
    return readImageResponse(await fetch(view));
  }
  throw new Error("ComfyUI timed out while drawing this scene.");
}

async function a1111(input: ImageRequest) {
  const base = (process.env.A1111_URL || "http://127.0.0.1:7860").replace(/\/$/, "");
  const response = await fetch(`${base}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: input.prompt,
      negative_prompt: input.negativePrompt || NEGATIVE_PROMPT,
      width: input.width,
      height: input.height,
      steps: 20,
      seed: input.seed ?? -1,
      cfg_scale: 7,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    if (isSafety(text)) throw new SafetyRejection(text.slice(0, 300));
    throw new Error(`Automatic1111 failed (${response.status}).`);
  }
  const body = (await response.json()) as { images?: string[] };
  const b64 = body.images?.[0];
  if (!b64) throw new Error("Automatic1111 returned no image.");
  return Buffer.from(b64, "base64");
}

async function fal(input: ImageRequest) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is empty.");
  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: input.prompt,
      image_size: { width: input.width, height: input.height },
      num_images: 1,
      enable_safety_checker: true,
      seed: input.seed,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    if (isSafety(text)) throw new SafetyRejection(text.slice(0, 300));
    throw new Error(`fal image request failed (${response.status}).`);
  }
  const body = (await response.json()) as { images?: { url?: string }[] };
  const url = body.images?.[0]?.url;
  if (!url) throw new Error("fal did not return an image URL.");
  return readImageResponse(await fetch(url));
}

async function replicate(input: ImageRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is empty.");
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=60" },
    body: JSON.stringify({
      input: { prompt: input.prompt, aspect_ratio: "9:16", output_format: "png", seed: input.seed },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    if (isSafety(text)) throw new SafetyRejection(text.slice(0, 300));
    throw new Error(`Replicate failed (${response.status}).`);
  }
  const body = (await response.json()) as { output?: string | string[]; error?: string };
  if (body.error) throw new Error(body.error);
  const url = Array.isArray(body.output) ? body.output[0] : body.output;
  if (!url) throw new Error("Replicate did not return an image.");
  return readImageResponse(await fetch(url));
}

async function openai(input: ImageRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is empty.");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: input.prompt,
      size: "1024x1536",
      n: 1,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    if (isSafety(text)) throw new SafetyRejection(text.slice(0, 300));
    throw new Error(`OpenAI image request failed (${response.status}).`);
  }
  const body = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = body.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) return readImageResponse(await fetch(first.url));
  throw new Error("OpenAI returned no image.");
}

export async function generateImage(input: ImageRequest & { styleKey?: string; scene?: number }) {
  const provider = (process.env.IMAGE_PROVIDER || "comfyui").toLowerCase();
  if (provider === "placeholder") {
    const style = artStyleByKey(input.styleKey || "realism");
    return placeholderPng({
      width: input.width,
      height: input.height,
      seed: input.seed ?? hashSeed(input.prompt),
      scene: input.scene ?? 0,
      palette: style.palette,
    });
  }
  if (provider === "comfyui") return comfy(input);
  if (provider === "a1111") return a1111(input);
  if (provider === "fal") return fal(input);
  if (provider === "replicate") return replicate(input);
  if (provider === "openai") return openai(input);
  throw new Error(`Unknown IMAGE_PROVIDER "${provider}".`);
}

export async function placeholderForStyle(styleKey: string) {
  const style = artStyleByKey(styleKey);
  return placeholderPng({ width: 720, height: 1280, seed: hashSeed(styleKey), scene: 1, palette: style.palette });
}
