"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, sendJson } from "@/lib/client";

type Track = { id: string; name: string; description: string | null; key: string | null; missing: boolean; isPreset: boolean };

export default function MusicPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["music"], queryFn: () => api<Track[]>("/api/music") });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/music", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
    },
    onSuccess: () => {
      toast.success("Track added");
      void client.invalidateQueries({ queryKey: ["music"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <div>
      <h1 className="display text-6xl">Music</h1>
      <p className="mt-2 max-w-2xl text-muted">Preset slots look for royalty-free files in assets/music. The files shipped here are short original tones so the mixer has something to play. Replace them before you post publicly.</p>
      <label className="btn mt-5 cursor-pointer">
        Upload mp3, wav, or m4a
        <input type="file" accept=".mp3,.wav,.m4a,audio/*" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
        }} />
      </label>
      <div className="mt-6 grid gap-3">
        {(query.data ?? []).map((track) => (
          <article key={track.id} className={`panel flex flex-wrap items-center gap-3 p-4 ${track.missing ? "opacity-60" : ""}`}>
            <div className="min-w-[200px] flex-1">
              <div className="font-bold">{track.name}</div>
              <div className="text-sm text-muted">{track.missing && track.key ? `Add assets/music/${track.key}.mp3` : track.description}</div>
            </div>
            {!track.missing && <audio controls preload="none" src={`/api/music/${track.id}/file`} />}
            {!track.isPreset && <button className="btn ghost" onClick={() => sendJson(`/api/music/${track.id}`, "DELETE").then(() => client.invalidateQueries({ queryKey: ["music"] }))}>Delete</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
