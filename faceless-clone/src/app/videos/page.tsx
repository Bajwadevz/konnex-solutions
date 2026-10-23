"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusChip } from "@/components/status-chip";
import { api, sendJson } from "@/lib/client";

type Video = { id: string; title: string | null; status: string; seriesId: string; series?: { name: string }; scheduledFor: string | null };
type Series = { id: string; name: string };

export default function VideosPage() {
  const [status, setStatus] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const client = useQueryClient();
  const series = useQuery({ queryKey: ["series"], queryFn: () => api<Series[]>("/api/series") });
  const videos = useQuery({
    queryKey: ["videos", status, seriesId],
    queryFn: () => api<Video[]>(`/api/videos?status=${status}&seriesId=${seriesId}`),
    refetchInterval: 3000,
  });
  const bulk = useMutation({
    mutationFn: (action: "approve" | "delete" | "regenerate") => sendJson("/api/videos", "POST", { action, ids: picked }),
    onSuccess: () => {
      toast.success("Updated");
      setPicked([]);
      void client.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const rows = videos.data ?? [];
  const allIds = useMemo(() => rows.map((video) => video.id), [rows]);
  return (
    <div>
      <h1 className="display text-6xl">All videos</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="field max-w-[200px]" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Every status</option>
          {["PENDING", "SCRIPTING", "VOICING", "IMAGING", "CAPTIONING", "RENDERING", "READY", "APPROVED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="field max-w-[220px]" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
          <option value="">Every series</option>
          {(series.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="btn ghost" disabled={!picked.length} onClick={() => bulk.mutate("approve")}>Approve</button>
        <button className="btn ghost" disabled={!picked.length} onClick={() => bulk.mutate("regenerate")}>Regenerate</button>
        <button className="btn ghost" disabled={!picked.length} onClick={() => bulk.mutate("delete")}>Delete</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-2"><input type="checkbox" checked={picked.length > 0 && picked.length === allIds.length} onChange={(event) => setPicked(event.target.checked ? allIds : [])} aria-label="Select all" /></th><th>Title</th><th>Series</th><th>Status</th><th>Slot</th></tr></thead>
          <tbody>
            {rows.map((video) => (
              <tr key={video.id} className="border-t border-white/10">
                <td className="p-2"><input type="checkbox" checked={picked.includes(video.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, video.id] : picked.filter((id) => id !== video.id))} aria-label={`Select ${video.title}`} /></td>
                <td className="p-2"><Link href={`/videos/${video.id}`} className="font-bold">{video.title || "Untitled"}</Link></td>
                <td className="p-2">{video.series?.name}</td>
                <td className="p-2"><StatusChip status={video.status} /></td>
                <td className="p-2 text-muted">{video.scheduledFor ? new Date(video.scheduledFor).toLocaleString() : "Manual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-6 text-muted">Nothing in this filter.</p>}
      </div>
    </div>
  );
}
