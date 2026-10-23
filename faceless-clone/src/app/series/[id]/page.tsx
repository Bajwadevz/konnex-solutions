"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProgressBar, StatusChip } from "@/components/status-chip";
import { api, sendJson } from "@/lib/client";

type SeriesDetail = {
  id: string;
  name: string;
  status: string;
  nicheKey: string;
  language: string;
  artStyleKey: string;
  voiceId: string;
  autoApprove: boolean;
  autoPublish: boolean;
  leadHours: number;
  publishTimes: string[];
  nextPublishAt: string | null;
  videos: { id: string; title: string | null; status: string; progress: number; scheduledFor: string | null; hasThumb: boolean }[];
};

export default function SeriesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const [count, setCount] = useState(3);
  const query = useQuery({
    queryKey: ["series", params.id],
    queryFn: () => api<SeriesDetail>(`/api/series/${params.id}`),
    refetchInterval: 3000,
  });
  const act = useMutation({
    mutationFn: async (input: { action: string; count?: number }) => {
      if (input.action === "delete") {
        await sendJson(`/api/series/${params.id}`, "DELETE");
        return "deleted";
      }
      if (input.action === "generate") return sendJson(`/api/series/${params.id}/generate`, "POST", { count: input.count ?? 1 });
      return sendJson(`/api/series/${params.id}/${input.action}`, "POST", {});
    },
    onSuccess: (result) => {
      if (result === "deleted") {
        router.push("/");
        return;
      }
      toast.success("Done");
      void client.invalidateQueries({ queryKey: ["series", params.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const series = query.data;
  if (!series) return <div className="skeleton h-64" />;
  return (
    <div>
      <div className="kicker">{series.nicheKey}</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-6xl">{series.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Link className="btn ghost" href={`/series/${series.id}/edit`}>Edit</Link>
          <button className="btn ghost" onClick={() => act.mutate({ action: series.status === "ACTIVE" ? "pause" : "resume" })}>{series.status === "ACTIVE" ? "Pause" : "Resume"}</button>
          <button className="btn ghost" onClick={() => { if (confirm("Delete this series and its videos?")) act.mutate({ action: "delete" }); }}>Delete</button>
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-muted">{series.language} · {series.artStyleKey} · voice {series.voiceId} · lead {series.leadHours}h · {series.autoApprove ? "auto-approve" : "review first"} · {series.autoPublish ? "auto-publish" : "manual publish"} · next {series.nextPublishAt ? new Date(series.nextPublishAt).toLocaleString() : "none in the next two weeks"}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => act.mutate({ action: "generate", count: 1 })}>Generate video</button>
        <input className="field w-24" type="number" min={1} value={count} onChange={(event) => setCount(Number(event.target.value))} aria-label="How many videos" />
        <button className="btn quiet" onClick={() => act.mutate({ action: "generate", count })}>Generate N</button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.videos.map((video) => (
          <Link key={video.id} href={`/videos/${video.id}`} className="panel overflow-hidden">
            <div className="aspect-[9/14] bg-black/40">
              {video.hasThumb ? <img alt="" src={`/api/videos/${video.id}/thumb`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted">Rendering</div>}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold">{video.title || "Untitled"}</div>
                <StatusChip status={video.status} />
              </div>
              <p className="mt-1 text-xs text-muted">{video.scheduledFor ? new Date(video.scheduledFor).toLocaleString() : "Manual"}</p>
              <div className="mt-2"><ProgressBar value={video.progress} /></div>
            </div>
          </Link>
        ))}
        {series.videos.length === 0 && <p className="text-muted">No videos yet. Generate one, or wait for the schedule.</p>}
      </div>
    </div>
  );
}
