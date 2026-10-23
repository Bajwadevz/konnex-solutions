"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api, sendJson } from "@/lib/client";
import { ART_STYLES } from "@/lib/artStyles";
import { CAPTION_FONTS, CAPTION_PRESETS, type CaptionStyle } from "@/lib/caption";
import { EFFECTS } from "@/lib/effects";
import { languagesForProvider } from "@/lib/languages";
import { nicheByKey, NICHES } from "@/lib/niches";
import { seriesWriteSchema, type SeriesWrite } from "@/lib/schemas";

const DURATIONS = [
  { label: "20–30 sec", min: 20, max: 30 },
  { label: "30–40 sec", min: 30, max: 40 },
  { label: "40–60 sec", min: 40, max: 60 },
  { label: "60–90 sec", min: 60, max: 90 },
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const STEP_FIELDS: (keyof SeriesWrite)[][] = [
  ["nicheKey", "customNichePrompt"],
  ["language", "voiceId"],
  ["musicTrackIds"],
  ["artStyleKey"],
  ["captionStyle"],
  ["effects"],
  ["accountIds"],
  ["name", "durationMinSec", "publishTimes", "publishDays", "timezone", "leadHours"],
];

type Voice = { id: string; name: string; descriptor: string; gender: string; accent: string | null };
type Track = { id: string; key: string | null; name: string; description: string | null; missing: boolean };
type Account = { id: string; platform: string; displayName: string };

function defaults(partial?: Partial<SeriesWrite>): SeriesWrite {
  return {
    name: "",
    nicheKey: "scary-stories",
    customNichePrompt: "",
    language: "en",
    voiceId: "vincent",
    musicTrackIds: [],
    artStyleKey: "creepy-comic",
    captionStyle: CAPTION_PRESETS.horror,
    effects: ["glitch"],
    durationMinSec: 30,
    durationMaxSec: 40,
    timezone: "UTC",
    publishTimes: ["18:00"],
    publishDays: [0, 1, 2, 3, 4, 5, 6],
    leadHours: 6,
    autoApprove: false,
    autoPublish: true,
    accountIds: [],
    ...partial,
  };
}

export function SeriesWizard({ mode, seriesId, initial }: { mode: "create" | "edit"; seriesId?: string; initial?: Partial<SeriesWrite> }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("");
  const [query, setQuery] = useState("");
  const [accent, setAccent] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const applied = useRef<string | null>(mode === "edit" ? initial?.nicheKey ?? null : null);
  const form = useForm<SeriesWrite>({ resolver: zodResolver(seriesWriteSchema), defaultValues: defaults(initial) });
  const nicheKey = form.watch("nicheKey");
  const language = form.watch("language");
  const caption = form.watch("captionStyle");
  const voices = useQuery({
    queryKey: ["voices", gender, query, accent],
    queryFn: () => api<{ voices: Voice[]; counts: { all: number; male: number; female: number }; accents: string[] }>(`/api/voices?gender=${gender}&q=${encodeURIComponent(query)}&accent=${encodeURIComponent(accent)}`),
  });
  const music = useQuery({ queryKey: ["music"], queryFn: () => api<Track[]>("/api/music") });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => api<Account[]>("/api/accounts") });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      api<{
        providers: { provider: string; detail: string }[];
        social: Record<"youtube" | "tiktok" | "instagram", { configured: boolean; missing: string[] }>;
      }>("/api/settings"),
  });
  const tts = settings.data?.providers.find((item) => item.provider === "tts")?.detail ?? "";
  const provider = tts.includes("elevenlabs") ? "elevenlabs" : tts.includes("kokoro") ? "kokoro" : "edge";

  useEffect(() => {
    if (mode !== "create") return;
    const raw = sessionStorage.getItem("faceless-wizard");
    if (!raw) return;
    try {
      form.reset(defaults(JSON.parse(raw) as Partial<SeriesWrite>));
    } catch {
      /* ignore broken drafts */
    }
  }, [form, mode]);

  useEffect(() => {
    if (mode !== "create") return;
    const sub = form.watch((value) => sessionStorage.setItem("faceless-wizard", JSON.stringify(value)));
    return () => sub.unsubscribe();
  }, [form, mode]);

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (mode === "create" && zone && form.getValues("timezone") === "UTC") form.setValue("timezone", zone);
  }, [form, mode]);

  useEffect(() => {
    if (!voices.data || !music.data) return;
    if (applied.current === nicheKey) return;
    applied.current = nicheKey;
    const niche = nicheByKey(nicheKey);
    form.setValue("artStyleKey", niche.defaultArtStyle);
    form.setValue("effects", niche.defaultEffects);
    form.setValue("captionStyle", nicheKey === "scary-stories" ? CAPTION_PRESETS.horror : CAPTION_PRESETS["bold-pop"]);
    const voice = voices.data.voices.find((item) => niche.defaultVoiceTags.includes(item.descriptor));
    if (voice) form.setValue("voiceId", voice.id);
    form.setValue(
      "musicTrackIds",
      music.data.filter((track) => track.key && niche.defaultMusicKeys.includes(track.key) && !track.missing).map((track) => track.id),
    );
  }, [form, music.data, nicheKey, voices.data]);

  async function next() {
    const fields = STEP_FIELDS[step - 1] ?? [];
    const ok = await form.trigger(fields);
    if (ok) setStep((value) => Math.min(8, value + 1));
  }

  async function save(generateNow: boolean) {
    const ok = await form.trigger();
    if (!ok) {
      toast.error("Check the highlighted step.");
      return;
    }
    const payload = { ...form.getValues(), generateNow };
    try {
      if (mode === "edit" && seriesId) {
        await sendJson(`/api/series/${seriesId}`, "PATCH", payload);
        toast.success("Series updated");
        router.push(`/series/${seriesId}`);
      } else {
        const created = await sendJson<{ id: string }>("/api/series", "POST", payload);
        sessionStorage.removeItem("faceless-wizard");
        toast.success(generateNow ? "Series created. First video is queued." : "Series created");
        router.push(`/series/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the series");
    }
  }

  function playVoice(id: string) {
    if (!audio.current) audio.current = new Audio();
    if (playing === id) {
      audio.current.pause();
      setPlaying(null);
      return;
    }
    audio.current.src = `/api/voices/${id}/preview?language=${language}`;
    void audio.current.play().then(() => setPlaying(id)).catch((err: Error) => toast.error(err.message));
    audio.current.onended = () => setPlaying(null);
  }

  const counts = voices.data?.counts ?? { all: 0, male: 0, female: 0 };
  const selectedMusic = form.watch("musicTrackIds");
  const selectedAccounts = form.watch("accountIds");
  const selectedEffects = form.watch("effects");

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <ol className="hidden lg:block">
        {["Niche", "Language & Voice", "Music", "Art Style", "Caption Style", "Effects", "Social Accounts", "Series Details"].map((label, index) => (
          <li key={label} className={`mb-3 border-l-2 pl-3 ${step === index + 1 ? "border-cadmium" : "border-white/10 text-muted"}`}>
            <div className="kicker">0{index + 1}</div>
            <div>{label}</div>
          </li>
        ))}
      </ol>
      <section className="panel min-w-0 p-5 md:p-7">
        <div className="kicker">Step {step} of 8</div>
        <h1 className="display mt-2 text-5xl">{["Niche", "Language & Voice", "Background music", "Art style", "Caption style", "Effects", "Connect social accounts", "Series details"][step - 1]}</h1>
        <div className="mt-6">
          {step === 1 && (
            <div className="grid-cards">
              {NICHES.map((niche) => (
                <button type="button" key={niche.key} onClick={() => form.setValue("nicheKey", niche.key)} className={`panel p-4 text-left ${nicheKey === niche.key ? "outline outline-2 outline-cadmium" : ""}`}>
                  <div className="font-bold">{niche.title}</div>
                  <p className="mt-1 text-sm text-muted">{niche.description}</p>
                </button>
              ))}
            </div>
          )}
          {step === 1 && nicheKey === "custom" && (
            <textarea className="field mt-4 min-h-28" placeholder="Describe the kind of stories you want" {...form.register("customNichePrompt")} />
          )}
          {step === 2 && (
            <div>
              <label className="kicker">Language</label>
              <select className="field mt-2" {...form.register("language")}>
                {languagesForProvider(provider).map((item) => (
                  <option key={item.code} value={item.code}>{item.flag} {item.name}</option>
                ))}
              </select>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["", `All (${counts.all})`],
                  ["male", `Male (${counts.male})`],
                  ["female", `Female (${counts.female})`],
                ].map(([value, label]) => (
                  <button type="button" key={label} className={`chip ${gender === value ? "on" : ""}`} onClick={() => setGender(value)}>{label}</button>
                ))}
                <input className="field max-w-xs" placeholder="Search voices" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className="field max-w-[180px]" value={accent} onChange={(event) => setAccent(event.target.value)}>
                  <option value="">All accents</option>
                  {(voices.data?.accents ?? []).map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="mt-4 grid max-h-[480px] gap-2 overflow-auto md:grid-cols-2">
                {(voices.data?.voices ?? []).map((voice) => (
                  <button type="button" key={voice.id} onClick={() => form.setValue("voiceId", voice.id)} className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left ${form.watch("voiceId") === voice.id ? "border-cadmium" : "border-white/10"}`}>
                    <span>
                      <span className="font-bold">{voice.name}</span>
                      <span className="ml-2 text-xs text-muted">{voice.descriptor} · {voice.gender}</span>
                    </span>
                    <span role="button" aria-label={`Preview ${voice.name}`} className="rounded-full bg-white/10 p-2" onClick={(event) => { event.stopPropagation(); playVoice(voice.id); }}>
                      {playing === voice.id ? <Pause size={14} /> : <Play size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <p className="text-muted">Choose as many songs as you want, we'll pick a random one for each video.</p>
              <div className="mt-4 grid gap-3">
                {(music.data ?? []).map((track) => (
                  <label key={track.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${track.missing ? "opacity-50" : "border-white/10"}`}>
                    <input type="checkbox" disabled={track.missing} checked={selectedMusic.includes(track.id)} onChange={(event) => {
                      const nextIds = event.target.checked ? [...selectedMusic, track.id] : selectedMusic.filter((id) => id !== track.id);
                      form.setValue("musicTrackIds", nextIds);
                    }} />
                    <span className="flex-1">
                      <span className="font-bold">{track.name}</span>
                      <span className="mt-1 block text-sm text-muted">{track.missing && track.key ? `Add assets/music/${track.key}.mp3` : track.description}</span>
                    </span>
                    {!track.missing && <audio controls preload="none" src={`/api/music/${track.id}/file`} className="h-8 max-w-[180px]" />}
                  </label>
                ))}
              </div>
              <button type="button" className="btn ghost mt-4" onClick={() => { form.setValue("musicTrackIds", []); setStep(4); }}>Skip</button>
            </div>
          )}
          {step === 4 && (
            <div>
              <p className="text-sm text-muted">Choose the visual style for your video</p>
              <div className="style-rail mt-4">
                {ART_STYLES.map((style) => {
                  const on = form.watch("artStyleKey") === style.key;
                  return (
                    <button type="button" key={style.key} onClick={() => form.setValue("artStyleKey", style.key)} className={`style-card ${on ? "on" : ""}`} aria-pressed={on}>
                      <span className="style-frame">
                        <img alt={`${style.label} style sample`} src={`/art-previews/${style.key}.jpg`} loading="lazy" />
                        {on && <span className="style-check" aria-hidden="true">✓</span>}
                      </span>
                      <span className="mt-2 block font-bold">{style.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted">Scroll sideways for more. Every scene in the series is drawn in the chosen style.</p>
            </div>
          )}
          {step === 5 && (
            <CaptionEditor value={caption} onChange={(next) => form.setValue("captionStyle", next)} />
          )}
          {step === 6 && (
            <div className="grid gap-3">
              {EFFECTS.map((effect) => {
                const on = selectedEffects.includes(effect.key);
                return (
                  <button type="button" key={effect.key} onClick={() => form.setValue("effects", on ? selectedEffects.filter((key) => key !== effect.key) : [...selectedEffects, effect.key])} className={`rounded-2xl border p-4 text-left ${on ? "border-cadmium" : "border-white/10"}`}>
                    <div className="font-bold">{effect.label}</div>
                    <p className="text-sm text-muted">{effect.description}</p>
                  </button>
                );
              })}
              <p className="text-sm text-muted">Optional. Leave them all off for a clean picture.</p>
            </div>
          )}
          {step === 7 && (
            <div className="grid gap-3">
              {(["youtube", "tiktok", "instagram"] as const).map((platform) => {
                const social = settings.data?.social?.[platform];
                return (
                <div key={platform} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold capitalize">{platform}</div>
                    {social?.configured ? (
                      <a className="btn ghost" href={`/api/auth/${platform}/start`}>Connect</a>
                    ) : (
                      <Link className="chip text-xs" href="/accounts">Needs setup</Link>
                    )}
                  </div>
                  {social && !social.configured && (
                    <p className="mt-2 text-xs text-muted">Add {social.missing.join(" and ")} to .env. The Accounts page has the steps.</p>
                  )}
                  <div className="mt-3 grid gap-2">
                    {(accounts.data ?? []).filter((account) => account.platform === platform).map((account) => (
                      <label key={account.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedAccounts.includes(account.id)} onChange={(event) => form.setValue("accountIds", event.target.checked ? [...selectedAccounts, account.id] : selectedAccounts.filter((id) => id !== account.id))} />
                        {account.displayName}
                      </label>
                    ))}
                  </div>
                </div>
                );
              })}
              <button type="button" className="btn ghost" onClick={() => { form.setValue("accountIds", []); setStep(8); }}>Skip — I'll download videos manually</button>
              <p className="text-sm text-muted">YouTube can work from localhost for test users. TikTok posts stay private until the app is audited. Instagram needs a public tunnel in PUBLIC_BASE_URL.</p>
            </div>
          )}
          {step === 8 && (
            <div className="grid gap-4">
              <label>Series name<input className="field mt-2" {...form.register("name")} /></label>
              <label>Video duration
                <select className="field mt-2" value={`${form.watch("durationMinSec")}-${form.watch("durationMaxSec")}`} onChange={(event) => {
                  const [min, max] = event.target.value.split("-").map(Number);
                  form.setValue("durationMinSec", min ?? 30);
                  form.setValue("durationMaxSec", max ?? 40);
                }}>
                  {DURATIONS.map((item) => <option key={item.label} value={`${item.min}-${item.max}`}>{item.label}</option>)}
                </select>
              </label>
              <div>
                <div className="kicker">Publish times · Your local time</div>
                {form.watch("publishTimes").map((time, index) => (
                  <input key={index} type="time" className="field mt-2" value={time} onChange={(event) => {
                    const nextTimes = [...form.getValues("publishTimes")];
                    nextTimes[index] = event.target.value;
                    form.setValue("publishTimes", nextTimes);
                  }} />
                ))}
                <button type="button" className="btn ghost mt-2" onClick={() => form.setValue("publishTimes", [...form.getValues("publishTimes"), "12:00"])}>Add another time</button>
              </div>
              <div className="flex gap-2">
                {DAYS.map((label, index) => {
                  const on = form.watch("publishDays").includes(index);
                  return <button type="button" key={`${label}-${index}`} className={`chip ${on ? "on" : ""}`} onClick={() => {
                    const days = form.getValues("publishDays");
                    form.setValue("publishDays", on ? days.filter((day) => day !== index) : [...days, index].sort());
                  }}>{label}</button>;
                })}
              </div>
              <label>Timezone<input className="field mt-2" {...form.register("timezone")} /></label>
              <p className="text-sm text-muted">Videos will be generated {form.watch("leadHours")} hours before the scheduled publish time so you have time to review them.</p>
              <button type="button" className="text-left text-sm underline" onClick={() => setAdvanced((value) => !value)}>Advanced</button>
              {advanced && (
                <label>Lead time (1–24 h)
                  <input type="number" min={1} max={24} className="field mt-2" {...form.register("leadHours", { valueAsNumber: true })} />
                </label>
              )}
              <label className="flex gap-2"><input type="checkbox" {...form.register("autoApprove")} /> Auto-approve</label>
              <label className="flex gap-2"><input type="checkbox" {...form.register("autoPublish")} /> Auto-publish</label>
            </div>
          )}
        </div>
        {form.formState.errors.root?.message && <p className="mt-3 text-sm text-[#ffb4a8]">{form.formState.errors.root.message}</p>}
        <div className="mt-8 flex flex-wrap gap-2">
          <button type="button" className="btn ghost" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < 8 && <button type="button" className="btn" onClick={() => void next()}>Next</button>}
          {step === 8 && <button type="button" className="btn" onClick={() => void save(false)}>{mode === "edit" ? "Save series" : "Create series"}</button>}
          {step === 8 && mode === "create" && <button type="button" className="btn quiet" onClick={() => void save(true)}>Create & generate first video now</button>}
        </div>
      </section>
    </div>
  );
}

function CaptionEditor({ value, onChange }: { value: CaptionStyle; onChange: (next: CaptionStyle) => void }) {
  const sample = "THEY NEVER FOUND HIM".split(" ");
  const words = value.uppercase ? sample : sample.map((word) => word.toLowerCase());
  const line = words.slice(0, value.wordsPerLine);
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,#3a2a22,#120e0c_60%)]">
        <div className={`absolute left-4 right-4 text-center ${value.position === "top" ? "top-[12%]" : value.position === "middle" ? "top-[46%]" : "top-[70%]"}`} style={{ fontFamily: value.font, fontSize: Math.max(18, value.size / 3.4), color: value.color, WebkitTextStroke: value.strokeWidth ? `${Math.max(1, value.strokeWidth / 4)}px ${value.strokeColor}` : undefined, paintOrder: "stroke fill" }}>
          {line.map((word, index) => <span key={word} style={{ color: index === line.length - 1 ? value.highlightColor : value.color, margin: "0 4px" }}>{word}</span>)}
        </div>
      </div>
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CAPTION_PRESETS) as CaptionStyle["preset"][]).map((preset) => (
            <button type="button" key={preset} className={`chip ${value.preset === preset ? "on" : ""}`} onClick={() => onChange(CAPTION_PRESETS[preset])}>{preset}</button>
          ))}
        </div>
        <label>Font
          <select className="field mt-1" value={value.font} onChange={(event) => onChange({ ...value, font: event.target.value })}>
            {CAPTION_FONTS.map((font) => <option key={font}>{font}</option>)}
          </select>
        </label>
        <label>Size {value.size}<input type="range" min={28} max={140} value={value.size} onChange={(event) => onChange({ ...value, size: Number(event.target.value) })} /></label>
        <label>Text color <input type="color" value={value.color} onChange={(event) => onChange({ ...value, color: event.target.value })} /></label>
        <label>Highlight <input type="color" value={value.highlightColor} onChange={(event) => onChange({ ...value, highlightColor: event.target.value })} /></label>
        <label>Stroke {value.strokeWidth}<input type="range" min={0} max={24} value={value.strokeWidth} onChange={(event) => onChange({ ...value, strokeWidth: Number(event.target.value) })} /></label>
        <label>Position
          <select className="field mt-1" value={value.position} onChange={(event) => onChange({ ...value, position: event.target.value as CaptionStyle["position"] })}>
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="lower-third">Lower third</option>
          </select>
        </label>
        <label className="flex gap-2"><input type="checkbox" checked={value.uppercase} onChange={(event) => onChange({ ...value, uppercase: event.target.checked })} /> Uppercase</label>
        <label>Words per line {value.wordsPerLine}<input type="range" min={1} max={4} value={value.wordsPerLine} onChange={(event) => onChange({ ...value, wordsPerLine: Number(event.target.value) })} /></label>
      </div>
    </div>
  );
}
