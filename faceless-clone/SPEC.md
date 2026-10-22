# FacelessReels Clone — Local Build Spec (for Cursor)

> **How to use this file:** Put it in the root of an empty project folder as `SPEC.md`. Open the folder in Cursor, start Agent mode, and paste:
> *"Read SPEC.md fully. Build the app phase by phase (Section 14). Finish and verify each phase's acceptance criteria before starting the next. Ask me only if something is blocked."*

---

## 1. What we're building

A **single-user, localhost web app** that automatically creates short vertical "faceless" videos (TikTok / Reels / Shorts style) from a "series" configuration, and optionally publishes them on a schedule.

It is a personal clone of [facelessreels.com](https://www.facelessreels.com). The original is a paid SaaS with accounts, billing and credit limits. **Ours has none of that:**

- No login, no billing, no plans, no credits.
- **No app-imposed limit** on number of series, videos, or generations per day/month.
- Runs entirely on `http://localhost:3000`.
- Only real-world limits apply: your machine's CPU/GPU/disk, and whatever the third-party APIs you choose charge or rate-limit (see Section 6 for free/local options).

## 2. Research notes on the original site

Findings from the public landing page (the product itself is behind Google sign-in, so the in-app wizard is taken from the user's own description):

| Item | Finding |
|---|---|
| Tagline | "Create viral faceless videos on auto-pilot" — generates **and posts** videos automatically, even while you sleep |
| Output | Short vertical videos; first video in under ~5 minutes |
| Core concept | A **Series** = niche + voice + music + art style + effects + connected accounts + schedule. The AI then produces videos for that series repeatedly |
| Step 1 of "How it works" | Create a series: choose niche and video format(s) |
| Step 2 | Customize: art styles, music (upload custom music **or enter a TikTok sound link**) |
| Step 3 | Connect accounts; automatic posting to **Instagram, TikTok, YouTube** |
| Showcase niches on landing | Mythology, School gossip, Scary stories, History, Act of kindness, Biblical stories, Anime stories, Heists |
| Positioning | Alternative to hiring editors ($50–200/video) or making videos yourself |
| Wizard | 8 steps (Niche → Language & Voice → Music → Art Style → *(step 5, see note)* → Effects → Social Accounts → Series Details) |
| Review window | Videos are generated 6 hours before publish time so the user can review them |

**Note on step 5:** the user's description lists "Art Style" twice (steps 4 and 5). Step 5 is almost certainly a different screen. **Assumption for this build: Step 5 = Caption Style** (font, color, position, highlight mode). Make it easy to change.

**Not copied (on purpose):** TikTok-sound-link input (TikTok has no public API for attaching sounds — replaced by custom music upload), subscriptions/billing, Google sign-in, affiliate program.

## 3. Tech stack (opinionated — do not substitute without reason)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + TypeScript** | One codebase for UI + API routes |
| UI | **Tailwind CSS + shadcn/ui + lucide-react** | Fast, clean wizard UI |
| State/forms | React Hook Form + Zod, TanStack Query | Wizard validation, polling job status |
| DB | **SQLite via Prisma** (`./data/app.db`) | Zero setup, local |
| Job queue | **In-process DB-backed queue** run by a separate **worker process** (`npm run worker`) | No Redis needed; survives restarts |
| Scheduler | `node-cron` inside the worker | Minute tick |
| Video rendering | **Remotion** (`@remotion/renderer`, `@remotion/bundler`) | Programmatic captions, Ken Burns, glitch effect, audio mixing |
| Captions timing | **whisper.cpp** via `@remotion/install-whisper-cpp` (or TTS word boundaries when provider supplies them) | Word-level timestamps |
| Audio utils | **ffmpeg** (system install) via `fluent-ffmpeg` | Normalize / measure / mix |
| Files | Local disk under `./storage/` served by a Next route | Simple |

**Prerequisites to document in README:** Node 20+, ffmpeg on PATH, (optional) Python 3.10+ for local TTS, (optional) ComfyUI/Automatic1111 for local images.

Run commands:

```bash
npm run dev       # Next.js UI on :3000
npm run worker    # background worker (queue + scheduler + publisher)
npm run dev:all   # both, using concurrently
```

## 4. Provider abstraction (core design rule)

Every external capability sits behind an interface so the user can swap providers from `.env` without touching app code.

```ts
// src/server/providers/types.ts
export interface ScriptProvider {
  generateScript(input: ScriptInput): Promise<GeneratedScript>;
}
export interface ImageProvider {
  generateImage(input: { prompt: string; negativePrompt?: string; width: number; height: number; seed?: number }): Promise<Buffer>;
}
export interface TTSProvider {
  listVoices(): Promise<ProviderVoice[]>;
  synthesize(input: { text: string; voiceId: string; language: string; speed?: number }):
    Promise<{ audio: Buffer; format: "mp3" | "wav"; wordTimings?: WordTiming[] }>;
}
export interface PublisherProvider {
  platform: "youtube" | "tiktok" | "instagram";
  publish(input: PublishInput): Promise<{ externalId: string; url?: string }>;
}
```

Implement these providers (select via env, default first):

| Capability | Implementations to build | Notes |
|---|---|---|
| Script (LLM) | `anthropic` (Claude), `openai`, `ollama` (fully local, free) | `SCRIPT_PROVIDER=anthropic` |
| Images | `fal` (FLUX), `replicate` (FLUX/SDXL), `openai` (gpt-image), `comfyui` (local, free), `a1111` (local, free) | `IMAGE_PROVIDER=comfyui` for truly unlimited/free |
| TTS | `edge` (Microsoft Edge neural voices — free, many languages, gives word boundaries), `kokoro` (local, free), `elevenlabs` (paid, best quality) | `TTS_PROVIDER=edge` default |
| Captions | `whisper-cpp` local | Fallback when TTS has no word timings |

Add a `/settings` page that shows which providers are active, tests each one with a "Test" button, and shows missing env vars clearly.

## 5. Project structure

```
faceless-clone/
├─ SPEC.md
├─ README.md
├─ .env.example
├─ package.json
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                      # niches, voices, art styles, music, effects
├─ assets/
│  ├─ music/                       # user drops .mp3 files here (see 8.3)
│  └─ fonts/                       # Anton, Montserrat ExtraBold, Bangers, etc. (OFL fonts)
├─ storage/                        # generated at runtime (gitignored)
│  ├─ videos/<videoId>/{script.json,voice.mp3,images/*.png,captions.json,final.mp4,thumb.jpg}
│  ├─ uploads/music/
│  └─ logs/
├─ remotion/
│  ├─ index.ts
│  ├─ Root.tsx
│  ├─ compositions/ReelComposition.tsx
│  ├─ components/{SceneImage.tsx,Captions.tsx,GlitchLayer.tsx,AudioMix.tsx}
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                  # Dashboard
│  │  ├─ series/new/page.tsx       # 8-step wizard
│  │  ├─ series/[id]/page.tsx      # series detail + videos
│  │  ├─ series/[id]/edit/page.tsx
│  │  ├─ videos/page.tsx           # all videos, filter by status
│  │  ├─ videos/[id]/page.tsx      # review/edit/approve
│  │  ├─ accounts/page.tsx
│  │  ├─ music/page.tsx
│  │  ├─ settings/page.tsx
│  │  └─ api/...                   # see Section 11
│  ├─ components/
│  ├─ lib/                         # zod schemas, constants, utils
│  └─ server/
│     ├─ db.ts
│     ├─ providers/                # script/, image/, tts/, publishers/
│     ├─ pipeline/                 # generateVideo.ts and step files
│     ├─ queue/                    # enqueue, claim, retry
│     ├─ scheduler/
│     └─ worker.ts                 # entry for `npm run worker`
```

## 6. Data model (Prisma, SQLite)

SQLite has no native enums/arrays in Prisma — use `String` with Zod validation and `Json` fields as noted.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model Series {
  id              String   @id @default(cuid())
  name            String
  nicheKey        String            // e.g. "scary-stories" or "custom"
  customNichePrompt String?         // used when nicheKey = "custom"
  language        String   @default("en")
  voiceId         String            // FK-ish to Voice.id
  musicTrackIds   String   @default("[]")   // JSON array of MusicTrack ids; random pick per video
  artStyleKey     String
  captionStyle    String   @default("{}")   // JSON: font, size, color, highlightColor, position, uppercase, stroke
  effects         String   @default("[]")   // JSON array: ["glitch"]
  durationMinSec  Int      @default(30)
  durationMaxSec  Int      @default(40)
  timezone        String   @default("UTC")
  publishTimes    String   @default("[]")   // JSON array of "HH:mm"
  publishDays     String   @default("[0,1,2,3,4,5,6]") // JSON, 0=Sunday
  leadHours       Int      @default(6)      // generate this many hours before publish
  autoApprove     Boolean  @default(false)  // if false, videos wait in review until approved
  autoPublish     Boolean  @default(true)
  status          String   @default("ACTIVE") // ACTIVE | PAUSED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  videos          Video[]
  accounts        SeriesAccount[]
}

model Video {
  id            String   @id @default(cuid())
  seriesId      String
  series        Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  status        String   @default("PENDING")
  // PENDING, SCRIPTING, VOICING, IMAGING, CAPTIONING, RENDERING, READY, APPROVED, PUBLISHING, PUBLISHED, FAILED, CANCELLED
  progress      Int      @default(0)        // 0-100
  topic         String?
  title         String?
  description   String?
  hashtags      String   @default("[]")
  scriptJson    String?                      // full GeneratedScript JSON
  scheduledFor  DateTime?                    // publish slot
  filePath      String?
  thumbPath     String?
  durationSec   Float?
  musicTrackId  String?
  error         String?
  attempts      Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  publications  Publication[]
}

model Publication {
  id          String   @id @default(cuid())
  videoId     String
  video       Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  accountId   String
  platform    String
  status      String   @default("PENDING")  // PENDING, PUBLISHED, FAILED
  externalId  String?
  url         String?
  error       String?
  createdAt   DateTime @default(now())
}

model SocialAccount {
  id             String @id @default(cuid())
  platform       String                // youtube | tiktok | instagram
  displayName    String
  externalUserId String?
  accessToken    String                // encrypt at rest with APP_SECRET (AES-256-GCM)
  refreshToken   String?
  expiresAt      DateTime?
  meta           String @default("{}")
  createdAt      DateTime @default(now())
  series         SeriesAccount[]
}

model SeriesAccount {
  seriesId  String
  accountId String
  series    Series        @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  account   SocialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@id([seriesId, accountId])
}

model Voice {
  id          String @id            // internal slug, e.g. "adam"
  name        String
  descriptor  String                // "Confident", "Eerie"...
  gender      String                // male | female
  accent      String?               // "British", "Irish"...
  language    String @default("en")
  providerKey String                // "edge" | "kokoro" | "elevenlabs"
  providerVoiceId String            // actual voice id for that provider
  previewPath String?               // cached preview mp3
}

model MusicTrack {
  id          String @id @default(cuid())
  key         String? @unique       // for presets
  name        String
  description String?
  filePath    String               // relative to project root
  isPreset    Boolean @default(false)
  createdAt   DateTime @default(now())
}

model Job {
  id          String   @id @default(cuid())
  type        String               // GENERATE_VIDEO | PUBLISH_VIDEO | VOICE_PREVIEW
  payload     String               // JSON
  status      String   @default("QUEUED") // QUEUED | RUNNING | DONE | FAILED
  runAfter    DateTime @default(now())
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  lockedAt    DateTime?
  error       String?
  createdAt   DateTime @default(now())
}

model Setting {
  key   String @id
  value String
}
```

## 7. The 8-step Series wizard (UI spec)

Route: `/series/new`. Full-width stepper with progress "Step N of 8", Back/Next buttons, per-step Zod validation, state kept in React state (and `sessionStorage` is fine here since this is a normal web app). Final step creates the series. Also reuse the same components for `/series/[id]/edit`.

### Step 1 — Niche

Grid of cards (icon + title + one-line description). Single select. Plus a **"Custom niche"** card with a textarea ("Describe the kind of stories you want").

Seed these niches exactly:

| key | Title | Description |
|---|---|---|
| `scary-stories` | Scary stories | Scary stories that give you goosebumps |
| `history` | History | Viral videos about history spanning from ancient times to the modern day |
| `greek-mythology` | Greek Mythology | Shocking and dramatic stories from Greek mythology |
| `historical-figures` | Historical Figures | Life story in one minute videos about the most important historical figures |
| `true-crime` | True Crime | Viral videos about true crime stories |
| `stoic-motivation` | Stoic Motivation | Viral videos about stoic philosophy and life lessons |
| `good-morals` | Good morals | Viral videos that teach people good morals and life lessons |
| `kids-stories` | Children stories | Heartwarming animal stories with a lesson, perfect for kids |
| `custom` | Custom | User-described niche |

Each niche has a **niche profile** in `src/lib/niches.ts` used by the script prompt:

```ts
export type NicheProfile = {
  key: string; title: string; description: string;
  tone: string;               // e.g. "slow-burn dread, second-person, ends on an unsettling twist"
  hookStyle: string;          // e.g. "open mid-scene with something wrong"
  structure: string;          // e.g. "hook → setup → escalation → twist → chilling last line"
  topicExamples: string[];    // 10 seed ideas
  avoid: string[];            // e.g. graphic gore, real private individuals
  defaultArtStyle: string; defaultVoiceTags: string[]; defaultMusicKeys: string[]; defaultEffects: string[];
  imageStyleAddendum: string; // niche-specific visual guidance
};
```

Selecting a niche pre-fills smart defaults in later steps (e.g. Scary → Creepy Comic, Vincent/Veda voices, Horror piano, Glitch on) but the user can change everything.

### Step 2 — Language & Voice

- Language dropdown with flag emoji. Start with: English, Spanish, French, German, Portuguese, Italian, Hindi, Urdu, Arabic, Indonesian, Turkish, Japanese, Korean (availability depends on TTS provider; hide languages the active provider can't speak).
- Voice picker: filter chips **All (60) · Male (34) · Female (26)** (counts computed from DB), search box, accent filter.
- Each voice is a card: name, descriptor badge, gender icon, ▶ preview button (plays a cached 5-second sample generated by the active TTS provider with a standard sentence; generate lazily and cache in `storage/voice-previews/`).
- Only one voice per series (unlike music).

**Voice catalog to seed (60).** `gender` values below are best guesses — the original UI shows a gender filter but not per-voice gender in the copy given, so keep it editable in `seed.ts`. Map each to a real `providerVoiceId` for the active provider; when a provider has fewer than 60 voices, map multiple catalog entries onto the closest available voice (match gender + accent + mood) and mark `descriptor` as the "style" label. Do not fail if a mapping is missing: fall back to a default voice of the same gender.

```
Adam (Confident, M) · Brittney (Energetic, F) · Jonah (Storyteller, M) · Hope (Bright, F)
Jamal (Chill, M) · Zara (Conversational, F) · Peter (Confident, M) · Jessica (Conversational, F)
James (Husky, M) · Jessa (Casual, F) · Brian (Deep, M) · Danielle (Canadian, F)
Michael (Conversational, M) · Lily (Expressive, F) · Hunter (Gritty, M) · Victoria (Upbeat, F)
Archer (British, M) · Veda (Eerie, F) · Ian (Mysterious, M) · Freya (Australian, F)
Liam (Warm, M) · Lauren (Mysterious, F) · Sully (Deep, M) · Riley (Energetic, F)
Vincent (Suspenseful, M) · Laura (Irish, F) · Titan (Powerful, M) · Autumn (Calm, F)
Knox (Serious, M) · Lorraine (Wise, F) · Tom (Australian, M) · Misha (Bold, F)
Declan (Eerie, M) · Isla (Scottish, F) · Spuds (Grandpa, M) · Nayva (Intense, F)
Chuck (Raspy, M) · Empress (Smoky, F) · David (Cinematic, M) · Mae (Southern, F)
Matt (Casual, M) · Vanessa (Soft, F) · Edwin (Warm, M) · Ravenna (Villain, F)
Jedediah (Southern, M) · Angus (Scottish, M) · Wyatt (Cowboy, M) · Astro (Smooth, M)
Alex (Upbeat, M) · Nassim (Powerful, M) · John (Storyteller, M) · Justin (Clear, M)
Monika (Indian, F) · Olaniyi (Nigerian, M) · Thandi (South African, F) · Ruhaan (Indian, M)
Tolani (Nigerian, F) · Denzel (Jamaican, M) · Annakay (Jamaican, F) · Ren (South African, M)
```

### Step 3 — Background Music (optional)

- Tabs: **Preset music** | **Custom**.
- Preset: cards with play/pause, name, description, and a checkbox. **Multi-select** — copy: *"Choose as many songs as you want, we'll pick a random one for each video."*
- Custom: drag-and-drop upload of `.mp3/.wav/.m4a` (max size configurable, default 50 MB). Uploaded tracks are saved to `storage/uploads/music/` and appear in the list for selection.
- "Skip" is allowed (no music).

Seed presets (names/descriptions from the original):

| key | Name | Description |
|---|---|---|
| `creepy-melody` | Creepy melody | Haunting and unsettling melody |
| `horror-piano` | Horror piano | Dark and chilling piano keys |
| `unsolved-mystery` | Unsolved mystery | Suspenseful and intriguing atmosphere |
| `8bit-slowed` | 8-bit slowed | Eerie chiptune with a haunting retro feel |
| `quiet-before-storm` | Quiet before storm | Building tension and anticipation for dramatic reveals |
| `brilliant-symphony` | Brilliant symphony | Orchestral and majestic for epic storytelling |

**Audio files are not included.** The seed script must register each preset pointing to `assets/music/<key>.mp3`. If a file is missing, show it greyed-out with "Add `assets/music/<key>.mp3`" and never crash. README must say to use royalty-free sources (e.g. Pixabay Music, YouTube Audio Library, Kevin MacLeod / incompetech with attribution) — **do not use copyrighted tracks** if you plan to post publicly.

### Step 4 — Art Style

Grid of 12 style cards, each with a preview thumbnail (generate once on first use with the active image provider and cache to `storage/style-previews/<key>.jpg`; show a gradient placeholder until then). Single select.

Styles and their **prompt suffix** (used on every scene image so the whole video is visually consistent). These are descriptive on purpose — do not put trademarked names (Disney, Pixar, Ghibli, Lego) into image prompts; many models refuse them and it keeps the output safer to publish.

| key | Label | Prompt suffix |
|---|---|---|
| `comic` | Comic | bold ink outlines, halftone shading, vibrant flat colors, western comic book panel art |
| `creepy-comic` | Creepy Comic | dark gritty comic art, heavy black ink, desaturated palette with sickly green and blood red accents, horror graphic novel |
| `modern-cartoon` | Modern Cartoon | clean vector cartoon, thick uniform outlines, bright saturated colors, expressive characters, modern animated series look |
| `disney` | Disney | classic 3D family animated film look, soft lighting, big expressive eyes, warm storybook colors, polished and whimsical |
| `mythology` | Mythology | ancient greek vase painting meets epic oil painting, golden light, marble and bronze textures, dramatic composition |
| `pixel-art` | Pixel Art | 16-bit pixel art, limited color palette, crisp pixels, retro video game scene |
| `ghibli` | Ghibli | hand-painted anime watercolor backgrounds, soft natural light, lush detail, gentle nostalgic pastoral mood |
| `anime` | Anime | high-quality anime key visual, dynamic angles, cel shading, vivid colors, dramatic lighting |
| `painting` | Painting | classical oil painting, visible brush strokes, rich chiaroscuro lighting, museum-quality |
| `dark-fantasy` | Dark Fantasy | grimdark fantasy concept art, moody fog, dramatic rim light, ornate detail, ominous atmosphere |
| `lego` | Lego | toy brick minifigure diorama, plastic brick textures, macro photography, shallow depth of field |
| `polaroid` | Polaroid | vintage instant photo, faded colors, soft flash, film grain, white border feel, found-photograph look |
| `realism` | Realism | photorealistic cinematic still, 35mm lens, natural lighting, high detail, shallow depth of field |

(That is 13 rows; the user's list shows 12 labels because "Comic" and "Creepy Comic" appear under a "Comic" heading — keep all 13, it is harmless.)

### Step 5 — Caption Style *(assumed — see Section 2 note)*

Live preview box (9:16) showing sample captions "THEY NEVER FOUND HIM" over a sample image. Options:

- Preset styles: **Bold Pop** (white, thick black stroke, current word highlighted yellow), **Karaoke** (all words visible, active word colored), **Minimal** (lowercase, soft shadow), **Horror** (red highlight, jittery).
- Controls: font (from `assets/fonts`), size, text color, highlight color, stroke width, position (top/middle/lower-third), uppercase toggle, words per line (1–4).
- Stored as JSON in `Series.captionStyle`.

### Step 6 — Effects (optional)

Toggle cards. Ship one effect to match the original, designed so more can be added by registering a component:

| key | Name | Behavior |
|---|---|---|
| `glitch` | Glitch effect | Glitches the subject with chromatic distortion and eerie shake — perfect for horror, thrillers, and scary content |

Effect registry pattern: `remotion/effects/index.ts` exports `{ key, label, description, Component }`. Optional extra effects to add after the core works: `film-grain`, `vignette`, `zoom-pulse`, `shake`.

### Step 7 — Connect Social Accounts

Cards for YouTube, TikTok, Instagram with **Connect** buttons (OAuth, see Section 12). Show connected accounts with avatar/name and a "Disconnect" button. Multi-select which accounts this series posts to. Include a prominent **"Skip — I'll download videos manually"** option; the app must be fully usable without any connected account.

### Step 8 — Series Details

- **Series name** (required).
- **Video duration:** select — `20–30 sec`, `30–40 sec` (default), `40–60 sec`, `60–90 sec`.
- **Schedule:** one or more publish times (time pickers, "Add another time"), day-of-week toggles, timezone (default = browser timezone, shown as "Your local time").
- Helper text: *"Videos will be generated 6 hours before the scheduled publish time so you have time to review them."* — make the lead time editable (1–24 h) under "Advanced".
- Checkboxes: **Auto-approve** (skip review) and **Auto-publish**.
- Buttons: **Create series**, and **Create & generate first video now**.

## 8. Video generation pipeline

Implemented in `src/server/pipeline/generateVideo.ts` as a sequence of idempotent steps. Each step writes its output to `storage/videos/<id>/`, updates `Video.status` and `progress`, and is **skipped on retry if its output file already exists**. Every step logs to `storage/logs/<id>.log`.

| # | Step | Status | Progress | Output |
|---|---|---|---|---|
| 1 | Pick topic + write script | SCRIPTING | 0→15 | `script.json` |
| 2 | Synthesize narration | VOICING | 15→30 | `voice.mp3` (+ `wordTimings.json` if available) |
| 3 | Generate scene images | IMAGING | 30→70 | `images/scene-XX.png` |
| 4 | Word-level captions | CAPTIONING | 70→75 | `captions.json` |
| 5 | Render video | RENDERING | 75→98 | `final.mp4`, `thumb.jpg` |
| 6 | Finish | READY (or APPROVED if auto-approve) | 100 | — |

### 8.1 Script generation

**Topic selection:** Before writing, load the last 100 `Video.topic` values for the series and pass them to the LLM as "already covered — do not repeat". Ask for ONE fresh topic fitting the niche profile. For efficiency, optionally generate a backlog of 20 topics in one call and store in `Setting` keyed `topics:<seriesId>`; pop one per video, refill when empty.

**Target length:** speech rate ≈ 2.5 words/sec. For 30–40 s → **75–100 words**. Compute `targetWords = round(avgSeconds * 2.5)` and give the LLM a ±10% range.

**LLM output must be strict JSON** (validate with Zod; on failure retry up to 2 times with the validation error appended):

```ts
type GeneratedScript = {
  topic: string;
  title: string;                 // ≤ 80 chars, hooky, usable as YouTube title
  description: string;           // 1–2 sentences + CTA
  hashtags: string[];            // 5–8, no '#'
  styleBible: string;            // consistent description of recurring characters/setting/palette for image prompts
  scenes: {
    narration: string;           // 1–2 short sentences, spoken text for this scene
    imagePrompt: string;         // vivid, self-contained, no art-style words (style suffix is appended in code)
  }[];                           // 8–12 scenes
};
```

**System prompt template** (put in `src/server/pipeline/prompts.ts`):

```
You write viral short-form video scripts for faceless channels.
Niche: {niche.title} — {niche.description}
Tone: {niche.tone}
Hook style: {niche.hookStyle}
Structure: {niche.structure}
Avoid: {niche.avoid}
Language of narration: {languageName}

Rules:
- The first sentence must be a scroll-stopping hook (max 12 words). No greetings, no "Welcome", no "In this video".
- Total narration is {minWords}-{maxWords} words. Short punchy sentences. Spoken-word friendly: no emojis, no hashtags, no stage directions, numbers spelled the way they are spoken.
- End with a strong last line or loop-back that makes viewers rewatch. Do not ask for likes/follows in the narration.
- Real events must be factually accurate. Do not invent quotes, victims, or details about real people. For true crime, do not name private individuals who were never publicly named by major outlets and avoid graphic detail.
- Split into {sceneMin}-{sceneMax} scenes, each ≈ 3–5 seconds of speech.
- For each scene write an imagePrompt: one concrete visual moment, subject + action + setting + mood + camera angle. Reuse the characters from styleBible so they look consistent. Never include text, captions, logos, or watermarks in the image. Never depict real celebrities' faces.
- Topics already covered (do not repeat): {pastTopics}
Return ONLY valid JSON matching the schema. No markdown fences.
```

### 8.2 Narration

- Concatenate scene narrations into one text (keeps prosody natural) — or synthesize per scene and concatenate if the provider has length limits.
- Save `voice.mp3`. Measure true duration with `ffprobe`.
- If duration > `durationMaxSec + 5`, re-synthesize with `speed = 1.1` (max one retry); never silently exceed 90 s.
- Normalize loudness to about **-16 LUFS** with ffmpeg `loudnorm`.

### 8.3 Scene images

- Size **1080×1920** if the provider supports it; otherwise generate 768×1344 (or provider-native 9:16) and upscale/crop-fill in Remotion.
- Final prompt = `{scene.imagePrompt}, {styleBible}, {artStyle.promptSuffix}, {niche.imageStyleAddendum}, vertical 9:16 composition, no text, no watermark`.
- Negative prompt (when supported): `text, letters, watermark, logo, signature, blurry, deformed hands, extra limbs, low quality`.
- Use one **seed per video** for local models to improve consistency.
- Generate with **concurrency = `IMAGE_CONCURRENCY` (default 2)**, retry each image 3× with exponential backoff, and on persistent failure for a single scene reuse the previous scene's image rather than failing the whole video.
- If the provider rejects a prompt for safety, rewrite it once through the LLM ("make this visual less graphic, keep the story beat") and retry.

### 8.4 Captions

- Prefer provider word timings; otherwise run whisper.cpp on `voice.mp3` (model `base.en`, or `base` for non-English, configurable) to get `[{word, startMs, endMs}]`.
- Group into caption "pages" of N words (from `captionStyle.wordsPerLine`), breaking early on punctuation.
- Save `captions.json`.

### 8.5 Rendering (Remotion)

- Composition `Reel`: **1080×1920, 30 fps**, duration = voice duration + 0.6 s tail.
- **Scenes:** each image displays from its narration start to the next scene's start (derive scene timing by aligning scene narration word counts to the word timings). Apply a **Ken Burns** move per scene (alternate slow zoom-in, zoom-out, pan left/right, deterministic from seed). Use 6-frame crossfade or hard cuts with a subtle zoom punch between scenes.
- **Captions component:** renders the current page, animates the active word (scale-pop 1.0→1.15, highlight color), uses `captionStyle`.
- **Audio:** narration at 0 dB; background music at about **-18 dB** looped/trimmed to length with a 1 s fade-in and 1.5 s fade-out; if narration is present, gently duck music further (-24 dB) during speech (simple fixed level is acceptable for v1).
- **Glitch effect (`glitch`):**
  - Render the scene image three times with `mix-blend-mode: screen`, tinted red/green/blue via SVG `feColorMatrix`, offset horizontally by a few pixels (RGB split).
  - Trigger "glitch bursts" for ~4–8 frames at pseudo-random moments (seeded `random()` from Remotion, never `Math.random()`), at scene cuts, and on the loudest words if timing allows. During a burst: increase RGB offset (6–20 px), add horizontal slice displacement (3–6 slices with random x-shifts), add 2–4 px camera shake, and a brief scanline/noise overlay.
  - Between bursts: a very subtle constant jitter (≤1.5 px) and slight chromatic aberration.
  - Must not affect captions legibility (captions render above the effect layer and are not distorted).
- Output H.264 + AAC, `yuv420p`, CRF ~18, `+faststart`, via `renderMedia`. Also grab a frame at ~1.2 s as `thumb.jpg`.
- Bundle once per worker process (cache the Remotion bundle) to avoid re-bundling every video.

### 8.6 Failure handling

- Per-step retries (see above); the whole job has `maxAttempts = 3` with backoff (1 min, 5 min).
- On final failure: `Video.status = FAILED`, `error` populated with a human-readable message, and a **Retry** button in the UI that re-queues from the last successful step.
- Worker must **recover stale jobs on startup**: any `RUNNING` job with `lockedAt` older than 30 min → back to `QUEUED`.

## 9. Scheduling & publishing

Worker runs `node-cron` every minute:

**Generation tick**
1. For each `ACTIVE` series, compute upcoming publish slots in its timezone (use `luxon`) for the next `leadHours` + 1 hour.
2. For each slot with no `Video` row having that `scheduledFor`, create a `Video` (status PENDING) and enqueue `GENERATE_VIDEO`.
3. If the slot is already closer than `leadHours` (e.g. series just created), generate immediately.

**Publish tick**
1. Find videos in `READY` (only if `autoApprove`) or `APPROVED`, with `scheduledFor <= now`, series `autoPublish = true`.
2. For each connected account on the series, create a `Publication` and enqueue `PUBLISH_VIDEO`.
3. If a video is still `READY` (unapproved) when its slot passes, **do not publish**; show a "Missed slot — approve to publish now" banner.

**Manual controls** (UI + API): *Generate now* (single), *Generate N videos* (batch, any N — **no cap**, queued and processed in order), *Pause/Resume series*, *Approve*, *Reject & regenerate*, *Publish now*, *Download MP4*.

**Concurrency:** `WORKER_CONCURRENCY` env (default 1 for rendering-heavy work; images may parallelize within a video). Keep an in-memory semaphore plus DB lock (`lockedAt`) when claiming jobs.

## 10. Pages & UX

| Page | Content |
|---|---|
| **Dashboard `/`** | Stat cards (series, videos total, ready for review, published, failed); "Create new series" CTA; list of active series with next publish time; recent videos with status chips and live progress bars (poll every 3 s) |
| **Series detail** | Config summary, Edit/Pause/Delete, **Generate video** and **Generate N** buttons, videos grid (thumbnail, title, status, scheduled time) |
| **Videos** | All videos, filter by status/series, bulk actions (approve, delete, regenerate) |
| **Video detail** | 9:16 video player, title/description/hashtags (editable inline), script + scenes list (view; allow editing narration and **regenerate single scene image**, then "Re-render"), status timeline with logs, publish status per platform, Approve / Reject / Regenerate / Publish now / Download |
| **Accounts** | Connected accounts, connect/disconnect, token health |
| **Music** | Preset + custom library, upload, delete, preview |
| **Settings** | Provider status + test buttons, concurrency, default timezone, storage usage, "Clear failed jobs" |

UI feel: dark theme by default, rounded cards, clear step progress, toasts for actions, skeleton loaders, mobile-responsive wizard. Empty states with helpful CTAs.

## 11. API routes (Next.js Route Handlers, all JSON, Zod-validated)

```
GET/POST        /api/series                      list / create
GET/PATCH/DELETE /api/series/:id
POST            /api/series/:id/generate         { count?: number }  // no upper bound
POST            /api/series/:id/pause|resume

GET             /api/videos?status=&seriesId=
GET/PATCH/DELETE /api/videos/:id
POST            /api/videos/:id/approve|reject|regenerate|publish|retry
POST            /api/videos/:id/scenes/:n/regenerate-image
GET             /api/videos/:id/file             // streams MP4 with Range support
GET             /api/videos/:id/thumb

GET             /api/voices?language=&gender=&q=
GET             /api/voices/:id/preview          // generates + caches sample

GET/POST/DELETE /api/music                       // POST = multipart upload
GET             /api/music/:id/file

GET             /api/niches
GET             /api/art-styles
GET             /api/art-styles/:key/preview

GET             /api/accounts
GET             /api/auth/:platform/start        // begins OAuth
GET             /api/auth/:platform/callback
DELETE          /api/accounts/:id

GET             /api/settings/providers          // status
POST            /api/settings/providers/:name/test
```

Streaming the MP4 with `Range` headers is required so the `<video>` player can seek.

## 12. Social publishing — what is actually possible on localhost

Build publishers behind the `PublisherProvider` interface. **Be honest in the UI about each platform's limits:**

| Platform | API | Localhost reality |
|---|---|---|
| **YouTube** | YouTube Data API v3 `videos.insert` (resumable upload) with OAuth 2.0 (Google Cloud project, "Desktop" or "Web" client, redirect `http://localhost:3000/api/auth/youtube/callback`). Upload as Short by using vertical video ≤ 3 min and adding `#Shorts` to title/description | Works locally. Unverified OAuth apps are limited to test users (add yourself). Uploads from unaudited API projects may default to **private** — note this in the UI |
| **TikTok** | Content Posting API (Direct Post) — requires a TikTok developer app and OAuth | Redirect to localhost is allowed in sandbox. Until the app passes TikTok's **audit**, posts from the API are restricted to **private (SELF_ONLY)** visibility. Show this warning. |
| **Instagram Reels** | Instagram Graph API — requires a **Business/Creator** account linked to a Facebook Page, a Meta app, and the `video_url` must be **publicly reachable** | Localhost isn't public. Provide an optional `PUBLIC_BASE_URL` env (e.g. from `cloudflared tunnel` or `ngrok`) used to serve `final.mp4` to Meta; if not set, the Instagram publisher is disabled with an explanatory tooltip |

Rules:
- Store tokens encrypted (AES-256-GCM using `APP_SECRET` from `.env`).
- Refresh tokens automatically before expiry; if refresh fails mark the account "Needs reconnect".
- Every publisher must support a **dry-run mode** (`PUBLISH_DRY_RUN=true`) that logs what it would send without calling the API, so the whole flow can be tested.
- **Fallback that always works:** *Download MP4* + copy-to-clipboard buttons for title/description/hashtags on each video.
- Add a per-publication "AI-generated content" disclosure flag where the platform API supports it (TikTok and YouTube both have synthetic-media disclosure options) and default it to **on**.

## 13. Configuration — `.env.example`

```env
# --- App ---
DATABASE_URL="file:./data/app.db"
APP_SECRET="change-me-to-a-long-random-string"
PUBLIC_BASE_URL=""                     # optional tunnel URL, needed only for Instagram
STORAGE_DIR="./storage"
WORKER_CONCURRENCY=1
IMAGE_CONCURRENCY=2

# --- Script (LLM) ---
SCRIPT_PROVIDER="anthropic"            # anthropic | openai | ollama
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-sonnet-4-5"    # use any current Claude model id
OPENAI_API_KEY=""
OPENAI_MODEL=""
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1"

# --- Images ---
IMAGE_PROVIDER="comfyui"               # comfyui | a1111 | fal | replicate | openai
COMFYUI_URL="http://127.0.0.1:8188"
A1111_URL="http://127.0.0.1:7860"
FAL_KEY=""
REPLICATE_API_TOKEN=""

# --- TTS ---
TTS_PROVIDER="edge"                    # edge | kokoro | elevenlabs
ELEVENLABS_API_KEY=""
KOKORO_URL="http://127.0.0.1:8880"

# --- Captions ---
WHISPER_MODEL="base.en"

# --- Social ---
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
META_APP_ID=""
META_APP_SECRET=""
PUBLISH_DRY_RUN="true"
```

Validate env at startup with Zod and show friendly errors on `/settings` instead of crashing.

## 14. Build phases for Cursor (do in order; verify each)

**Phase 0 — Scaffold.** Next.js + TS + Tailwind + shadcn/ui, Prisma + SQLite, `.env.example`, `README.md` with prerequisites, `dev:all` script. *Accept:* `npm run dev:all` starts both processes; `/` renders a dashboard shell; DB migrates.

**Phase 1 — Seed data & catalog APIs.** Seed niches, 60 voices, 6 music presets (graceful missing files), 13 art styles, effects. *Accept:* `/api/niches`, `/api/voices` (filters + counts 60 total), `/api/art-styles` return data.

**Phase 2 — Wizard UI.** All 8 steps, validation, defaults per niche, create/edit series. Voice preview and style preview can be stubbed (placeholder) until later phases. *Accept:* can create a series; it appears on dashboard; edit round-trips every field.

**Phase 3 — Provider layer.** Interfaces + at least: `ollama` or `anthropic` (script), `edge` (TTS), `comfyui` or `fal` (images), `whisper-cpp` (captions). `/settings` page with Test buttons. Wire voice previews. *Accept:* each Test button passes with valid config; voice preview plays in the wizard.

**Phase 4 — Queue & worker.** DB-backed queue, claim/lock, retries, stale-job recovery, `worker.ts`. *Accept:* enqueue a dummy job → processed by worker; kill worker mid-job → recovered on restart.

**Phase 5 — Pipeline steps 1–4.** Script (with Zod + retry), narration (+ loudnorm), images (concurrency + fallbacks), captions. *Accept:* "Generate video" produces a folder with `script.json`, `voice.mp3`, all scene images, `captions.json`; status/progress update live in UI.

**Phase 6 — Remotion render.** Reel composition with Ken Burns, animated captions, music mix, glitch effect, thumbnail. *Accept:* produces a playable 1080×1920 MP4 of 30–40 s with synced captions and audible music; glitch toggles on/off; video plays with seeking in the UI.

**Phase 7 — Review UI.** Video detail page, edit metadata, regenerate scene image, re-render, approve/reject, downloads, batch "Generate N". *Accept:* generating 10 videos in a row works with no cap or error; failed one can be retried.

**Phase 8 — Scheduler.** Generation tick + publish tick, timezone-correct slots, lead-time logic, missed-slot handling. *Accept:* a series with a slot 10 minutes away creates and renders a video immediately; with `PUBLISH_DRY_RUN=true` the publish log fires at the slot time.

**Phase 9 — Social accounts.** OAuth + publishers (YouTube first, then TikTok, then Instagram behind `PUBLIC_BASE_URL`), encrypted tokens, refresh, dry-run. *Accept:* YouTube upload of a test video works for a connected test account.

**Phase 10 — Polish.** Empty states, error toasts, loading skeletons, README with screenshots-free setup guide (including recommended free/local stack: Ollama + Edge TTS + ComfyUI), a `scripts/doctor.ts` command that checks Node, ffmpeg, env, and providers.

## 15. Quality bar & rules for Cursor

- TypeScript `strict: true`; no `any` without a comment; Zod on every API boundary.
- Never block the Next.js server on heavy work — all generation/rendering runs in the worker.
- All file paths are built with `path.join` from `STORAGE_DIR`; never accept raw paths from the client (prevent path traversal).
- Never log secrets or tokens.
- Every long-running step reports progress; every failure has a human-readable message in the UI.
- Prefer small, testable functions; add unit tests (Vitest) for: script Zod validation, schedule-slot calculation (timezones/DST), caption grouping, scene-timing alignment, prompt assembly.
- Don't add features outside this spec (no auth, billing, teams, credit system).
- Keep the UI copy from the original where this spec quotes it.

## 16. Known limitations to state in the README

1. "Unlimited" means the app imposes no limits. Cloud image/LLM/TTS APIs bill per use; fully free-and-unlimited requires the local stack (Ollama + Edge TTS or Kokoro + ComfyUI) and a reasonably powerful GPU for images.
2. Generating a video takes minutes, mostly images and rendering; cloud providers are faster than a weak local GPU.
3. Publishing to TikTok/Instagram/YouTube is constrained by each platform's API review and policies (Section 12). Auto-posting at high volume can trigger spam detection or account restrictions — the user is responsible for compliance with each platform's terms.
4. Preset music audio files and the exact voice timbres of the original app are not reproducible; voices are approximated by whichever TTS provider is configured.
5. Prompts avoid trademarked style names; "Disney", "Ghibli" and "Lego" cards are labels only, and results are *inspired-by* looks, not official assets.
6. Factual niches (history, true crime) can contain LLM errors — keep the review step on (`autoApprove = false`) for those series.

## 17. Definition of done

- [ ] `npm run dev:all` starts the app and worker on localhost with only `.env` configured.
- [ ] An 8-step wizard matches Sections 7 (niches, voices, music, art styles, effects, accounts, details).
- [ ] A series can generate a 30–40 s vertical MP4 end-to-end with voice, AI images, animated captions, music, and optional glitch effect.
- [ ] Videos can be generated in unlimited quantities (batch of 50 queues and completes without app errors).
- [ ] Scheduler generates videos `leadHours` before slots and publishes (or dry-runs) at slot time.
- [ ] At least YouTube publishing works; others degrade gracefully with clear messaging.
- [ ] Any failure is recoverable from the UI with a Retry.
