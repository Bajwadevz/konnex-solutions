# Faceless Reels

A single-user localhost studio that writes, voices, illustrates, captions, and renders vertical faceless videos from a series, then can publish them on a schedule.

There is no login, billing, plan, or credit counter. The app will queue as many videos as you ask for. The real limits are your CPU, disk, and whatever third-party APIs you turn on.

## Prerequisites

- Node.js 20+
- ffmpeg and ffprobe on your PATH
- Chrome or Chromium (Remotion renders with it)
- Optional: Python 3.10+ if you later add a local TTS server
- Optional: [Ollama](https://ollama.com), ComfyUI, or Automatic1111 for a fully local stack

## Setup

```bash
cd faceless-clone
cp .env.example .env
# Put a long random string in APP_SECRET
npm install
npm run db:setup
npm run doctor
npm run dev:all
```

Open http://localhost:3000.

- `npm run dev` — the studio on port 3000
- `npm run worker` — queue, scheduler, and publisher
- `npm run dev:all` — both
- `npm test` — schedule, caption, prompt, and script checks
- `npm run doctor` — Node, ffmpeg, env, fonts, database

The database is SQLite at `data/app.db`. Generated files live under `storage/`.

## Zero-config path

`.env.example` points at Anthropic and ComfyUI, which is what you want once you have keys and a GPU. To render on a machine with neither, set:

```env
SCRIPT_PROVIDER=builtin
IMAGE_PROVIDER=placeholder
TTS_PROVIDER=edge
PUBLISH_DRY_RUN=true
```

- `builtin` writes a valid script from the niche profile. It does not call a model.
- `placeholder` draws abstract 9:16 stills so the edit finishes without an image API. Swap this before you care about the pictures.
- `edge` uses Microsoft Edge neural voices and returns word timings. No key.
- Dry-run publishing writes what it would upload and does not call YouTube, TikTok, or Instagram.

## Recommended free stack

| Piece | Setting |
|---|---|
| Scripts | `SCRIPT_PROVIDER=ollama` and a local model such as `llama3.1` |
| Voice | `TTS_PROVIDER=edge`, or `kokoro` at `KOKORO_URL` |
| Images | `IMAGE_PROVIDER=comfyui` at `COMFYUI_URL` (or `a1111`) |
| Captions | Edge word timings. Install whisper.cpp only if a provider does not return timings. |

Cloud image, LLM, and TTS APIs bill per call. "Unlimited" means this app does not add a cap.

## What you can do

1. Create a series in the 8-step wizard: niche, language and voice, music, art style, captions, effects, accounts, schedule.
2. Generate one video or any number of videos. There is no app-side maximum.
3. Review the 9:16 player, edit the title, description, hashtags, and scene narration, regenerate a scene image, then re-render.
4. Approve, reject and regenerate, retry a failure, download the MP4, or publish now.
5. Leave a series active. The worker checks every minute and creates a video `leadHours` before each slot (default 6). Unapproved videos are not posted after the slot; the video page says **Missed slot — approve to publish now**.

## Music

Preset names match the product this is cloned from. `assets/music/*.mp3` in this repo are short original synthesized tones so the mixer is audible out of the box. Replace them with tracks you have the right to use (Pixabay Music, YouTube Audio Library, or Kevin MacLeod / incompetech with attribution) before you publish anything. If a preset file is missing, the card is grey and tells you the path to add. Do not drop copyrighted songs in here if you plan to post the videos.

Caption fonts (Anton, Montserrat ExtraBold, Bangers) are OFL faces in `assets/fonts` and `public/fonts`.

## Publishing

| Platform | What actually happens on localhost |
|---|---|
| YouTube | Data API resumable upload. Add yourself as a test user on an unverified OAuth client. Unaudited projects may force **private** videos. The upload adds `#Shorts` and marks the video as synthetic. |
| TikTok | Content Posting API. Sandbox may redirect to localhost. Until TikTok audits the app, posts are **SELF_ONLY**. `is_aigc` is on. |
| Instagram | Needs a professional account linked to a Facebook Page. Meta must download the file, so set `PUBLIC_BASE_URL` to a tunnel (cloudflared or ngrok). Without it, Instagram stays disabled. |

Tokens are encrypted with AES-256-GCM using `APP_SECRET`. `PUBLISH_DRY_RUN=true` skips the network and still records a publication id that starts with `dry-run-`.

Every video also has download and copy buttons for the title, description, and hashtags. That path always works.

## Known limits

1. Unlimited means the app imposes no cap. APIs still bill. A free unlimited setup is Ollama + Edge (or Kokoro) + ComfyUI, and a GPU that can actually draw.
2. A video takes minutes. Images and the Remotion render dominate. Cloud image models are faster than a weak local GPU.
3. Auto-posting a lot of videos can trip spam checks. You are responsible for each platform's rules.
4. These voices are the configured TTS provider's voices, not the original product's.
5. "Disney", "Ghibli", and "Lego" are labels. Prompts describe the look and do not use those trademarked names.
6. History and true crime scripts can be wrong. Leave auto-approve off for those series.
7. The builtin writer and placeholder images are there so the studio runs before you connect providers. They are not a substitute for a model and a real image pass.

## Layout

`src/app` is the studio. `src/server` is providers, the pipeline, the queue, and the scheduler. `remotion/` is the 1080×1920 composition. The worker is the only process that renders.
