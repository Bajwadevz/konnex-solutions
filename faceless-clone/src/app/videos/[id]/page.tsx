"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusChip } from "@/components/status-chip";
import { api, sendJson } from "@/lib/client";

type Scene = { narration: string; imagePrompt: string };
type Video = {
  id: string;
  title: string | null;
  description: string | null;
  hashtags: string[];
  status: string;
  progress: number;
  error: string | null;
  hasFile: boolean;
  updatedAt: string;
  missedSlot: boolean;
  scheduledFor: string | null;
  log: string;
  script: { topic: string; title: string; description: string; hashtags: string[]; styleBible: string; scenes: Scene[] } | null;
  publications: { id: string; platform: string; status: string; url: string | null; error: string | null; externalId: string | null }[];
};

const STEPS = ["SCRIPTING", "VOICING", "IMAGING", "CAPTIONING", "RENDERING", "READY"];

export default function VideoPage() {
  const params = useParams<{ id: string }>();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["video", params.id], queryFn: () => api<Video>(`/api/videos/${params.id}`), refetchInterval: 3000 });
  const [draft, setDraft] = useState<Video | null>(null);
  const video = draft && draft.id === query.data?.id ? { ...query.data, ...draft } : query.data;
  const save = useMutation({
    mutationFn: () => sendJson(`/api/videos/${params.id}`, "PATCH", {
      title: video?.title,
      description: video?.description,
      hashtags: video?.hashtags,
      script: video?.script,
    }),
    onSuccess: () => {
      toast.success("Saved");
      void client.invalidateQueries({ queryKey: ["video", params.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const act = useMutation({
    mutationFn: async (action: string) => sendJson(`/api/videos/${params.id}/${action}`, "POST", action === "rerender" ? { respeak: false } : {}),
    onSuccess: () => {
      toast.success("Queued");
      void client.invalidateQueries({ queryKey: ["video", params.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!video) return <div className="skeleton h-[70vh]" />;
  const order = STEPS.indexOf(video.status);
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div>
        <div className="mx-auto aspect-[9/16] max-w-[380px] overflow-hidden rounded-[28px] bg-black">
          {video.hasFile ? <video key={video.updatedAt} src={`/api/videos/${video.id}/file`} controls className="h-full w-full" /> : <div className="grid h-full place-items-center p-6 text-center text-muted">The picture shows up when rendering finishes. {video.progress}%</div>}
        </div>
        <a className="btn mt-3 w-full" href={`/api/videos/${video.id}/file`} download>Download MP4</a>
      </div>
      <div>
        {video.missedSlot && <div className="mb-4 rounded-2xl bg-[#ffb4a8] px-4 py-3 font-bold text-[#2a0c08]">Missed slot — approve to publish now</div>}
        <div className="flex items-center gap-3"><StatusChip status={video.status} /> <span className="text-sm text-muted">{video.scheduledFor ? new Date(video.scheduledFor).toLocaleString() : "Manual"}</span></div>
        {video.error && <p className="mt-3 text-[#ffb4a8]">{video.error}</p>}
        <label className="mt-4 block">Title
          <input className="field mt-1" value={video.title ?? ""} onChange={(event) => setDraft({ ...video, title: event.target.value })} />
        </label>
        <label className="mt-3 block">Description
          <textarea className="field mt-1 min-h-24" value={video.description ?? ""} onChange={(event) => setDraft({ ...video, description: event.target.value })} />
        </label>
        <label className="mt-3 block">Hashtags
          <input className="field mt-1" value={video.hashtags.join(" ")} onChange={(event) => setDraft({ ...video, hashtags: event.target.value.split(/\s+/).filter(Boolean).map((tag) => tag.replace(/^#/, "")) })} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn ghost" onClick={() => void copy(video.title || "")}>Copy title</button>
          <button className="btn ghost" onClick={() => void copy(video.description || "")}>Copy description</button>
          <button className="btn ghost" onClick={() => void copy(video.hashtags.map((tag) => `#${tag}`).join(" "))}>Copy hashtags</button>
          <button className="btn" onClick={() => save.mutate()}>Save</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={() => act.mutate("approve")}>Approve</button>
          <button className="btn ghost" onClick={() => act.mutate("reject")}>Reject & regenerate</button>
          <button className="btn ghost" onClick={() => act.mutate("regenerate")}>Regenerate</button>
          <button className="btn ghost" onClick={() => act.mutate("retry")}>Retry</button>
          <button className="btn ghost" onClick={() => act.mutate("rerender")}>Re-render</button>
          <button className="btn quiet" onClick={() => act.mutate("publish")}>Publish now</button>
        </div>
        <h2 className="kicker mt-8">Timeline</h2>
        <ol className="mt-2 grid gap-1">
          {STEPS.map((step, index) => <li key={step} className={order >= index || video.status === "APPROVED" || video.status === "PUBLISHED" ? "" : "text-muted"}>{step}</li>)}
        </ol>
        <h2 className="kicker mt-6">Publishing</h2>
        <ul className="mt-2 grid gap-2">
          {video.publications.length === 0 && <li className="text-muted">Nothing posted yet. Download always works.</li>}
          {video.publications.map((item) => (
            <li key={item.id} className="rounded-2xl border border-white/10 px-3 py-2">
              <b className="capitalize">{item.platform}</b> · {item.status} {item.externalId?.startsWith("dry-run") ? "(dry run)" : ""} {item.url && <a className="underline" href={item.url}>{item.url}</a>}
              {item.error && <div className="text-[#ffb4a8]">{item.error}</div>}
            </li>
          ))}
        </ul>
        <h2 className="kicker mt-6">Scenes</h2>
        <div className="mt-2 grid gap-3">
          {video.script?.scenes.map((scene, index) => (
            <div key={index} className="rounded-2xl border border-white/10 p-3">
              <div className="text-xs text-muted">Scene {index + 1}</div>
              <textarea className="field mt-2" value={scene.narration} onChange={(event) => {
                if (!video.script) return;
                const scenes = video.script.scenes.map((item, itemIndex) => itemIndex === index ? { ...item, narration: event.target.value } : item);
                setDraft({ ...video, script: { ...video.script, scenes } });
              }} />
              <button className="btn ghost mt-2" onClick={() => sendJson(`/api/videos/${video.id}/scenes/${index + 1}/regenerate-image`, "POST").then(() => toast.success("Scene image queued")).catch((err: Error) => toast.error(err.message))}>Regenerate image</button>
            </div>
          ))}
        </div>
        <h2 className="kicker mt-6">Log</h2>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/40 p-3 text-xs text-muted">{video.log || "No log yet."}</pre>
      </div>
    </div>
  );
}
