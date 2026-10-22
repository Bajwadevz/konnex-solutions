"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, sendJson } from "@/lib/client";

type Overview = {
  providers: { provider: string; configured: boolean; missing: string[]; detail: string }[];
  social: { dryRun: boolean; youtube: { configured: boolean; missing: string[]; note: string }; tiktok: { configured: boolean; missing: string[]; note: string }; instagram: { configured: boolean; missing: string[]; note: string } };
  timezone: string;
  storageBytes: number;
  failedJobs: number;
  workerConcurrency: number;
  imageConcurrency: number;
};

export default function SettingsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api<Overview>("/api/settings") });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const test = useMutation({
    mutationFn: async (name: string) => {
      const result = await sendJson<{ ok: boolean; detail: string }>(`/api/settings/providers/${name}/test`, "POST", {});
      return { name, ...result };
    },
    onSuccess: (result) => {
      setNotes((current) => ({ ...current, [result.name]: result.detail }));
      toast[result.ok ? "success" : "error"](result.detail);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const data = query.data;
  if (!data) return <div className="skeleton h-80" />;
  const mb = (data.storageBytes / (1024 * 1024)).toFixed(1);
  return (
    <div>
      <h1 className="display text-6xl">Settings</h1>
      <p className="mt-2 text-muted">Dry run is {data.social.dryRun ? "on" : "off"}. Worker concurrency {data.workerConcurrency}. Image concurrency {data.imageConcurrency}.</p>
      <div className="mt-6 grid gap-3">
        {data.providers.map((provider) => (
          <article key={provider.provider} className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold capitalize">{provider.provider}</h2>
                <p className="text-sm text-muted">{provider.detail}</p>
                {provider.missing.length > 0 && <p className="mt-1 text-sm text-[#ffb4a8]">Missing: {provider.missing.join(", ")}</p>}
                {notes[provider.provider] && <p className="mt-1 text-sm">{notes[provider.provider]}</p>}
              </div>
              <button className="btn" disabled={!provider.configured || test.isPending} onClick={() => test.mutate(provider.provider)}>Test</button>
            </div>
          </article>
        ))}
      </div>
      <section className="panel mt-4 p-4">
        <h2 className="font-bold">Social limits</h2>
        <ul className="mt-2 grid gap-2 text-sm text-muted">
          <li>YouTube — {data.social.youtube.note} {data.social.youtube.missing.join(", ")}</li>
          <li>TikTok — {data.social.tiktok.note} {data.social.tiktok.missing.join(", ")}</li>
          <li>Instagram — {data.social.instagram.note} {data.social.instagram.missing.join(", ")}</li>
        </ul>
      </section>
      <section className="panel mt-4 p-4">
        <label>Default timezone
          <input className="field mt-2" defaultValue={data.timezone} onBlur={(event) => sendJson("/api/settings", "PATCH", { timezone: event.target.value }).then(() => toast.success("Timezone saved"))} />
        </label>
        <p className="mt-3 text-sm text-muted">Storage {mb} MB · failed jobs {data.failedJobs}</p>
        <button className="btn ghost mt-3" onClick={() => sendJson("/api/settings/clear-failed", "POST").then(() => { toast.success("Cleared"); void client.invalidateQueries({ queryKey: ["settings"] }); })}>Clear failed jobs</button>
      </section>
    </div>
  );
}
