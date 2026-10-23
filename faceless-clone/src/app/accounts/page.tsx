"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { api, sendJson } from "@/lib/client";

type Account = { id: string; platform: string; displayName: string; health: string; expiresAt: string | null };
type SocialStatus = { configured: boolean; missing: string[]; note: string };
type Settings = { social: { dryRun: boolean; youtube: SocialStatus; tiktok: SocialStatus; instagram: SocialStatus } };

const PLATFORMS: { key: "youtube" | "tiktok" | "instagram"; label: string; note: string; consoleUrl: string; consoleLabel: string }[] = [
  {
    key: "youtube",
    label: "YouTube",
    note: "Works locally for Google test users. Unaudited projects may upload as private. Shorts need a vertical video and #Shorts.",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleLabel: "Google Cloud console",
  },
  {
    key: "tiktok",
    label: "TikTok",
    note: "Sandbox can redirect to localhost. Until TikTok audits the app, posts stay private (SELF_ONLY). AI disclosure is on.",
    consoleUrl: "https://developers.tiktok.com/apps",
    consoleLabel: "TikTok for Developers",
  },
  {
    key: "instagram",
    label: "Instagram",
    note: "Needs a professional account on a Facebook Page, and PUBLIC_BASE_URL so Meta can fetch the MP4. Disabled without that tunnel.",
    consoleUrl: "https://developers.facebook.com/apps",
    consoleLabel: "Meta for Developers",
  },
];

function AccountsBody() {
  const params = useSearchParams();
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["accounts"], queryFn: () => api<Account[]>("/api/accounts") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/api/settings") });
  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/accounts/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Disconnected");
      void client.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
  const error = params.get("error");
  const connected = params.get("connected");

  useEffect(() => {
    if (!error && !connected) return;
    if (error) toast.error(error);
    if (connected) toast.success(`Connected ${connected}.`);
    router.replace("/accounts");
  }, [connected, error, router]);

  const social = settings.data?.social;
  return (
    <div>
      <h1 className="display text-6xl">Accounts</h1>
      <p className="mt-2 max-w-2xl text-muted">Connect a channel when you want auto-posting. The studio is fully usable with none. Publishing defaults to a dry run until you set PUBLISH_DRY_RUN=false.</p>
      {social?.dryRun && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-phosphor" /> Dry run is on. Nothing is posted to real channels yet.
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const status = social?.[platform.key];
          const ready = status?.configured ?? false;
          const linked = (query.data ?? []).filter((account) => account.platform === platform.key);
          return (
            <section key={platform.key} className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{platform.label}</h2>
                {ready ? (
                  <a className="btn" href={`/api/auth/${platform.key}/start`}>Connect</a>
                ) : (
                  <span className="chip text-xs">Needs setup</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted">{platform.note}</p>
              {status && !ready && (
                <div className="mt-4 rounded-2xl bg-black/30 p-3 text-sm">
                  <div className="kicker">Before you connect</div>
                  <p className="mt-1">
                    Add {status.missing.map((name, index) => (
                      <span key={name}>
                        {index > 0 && (index === status.missing.length - 1 ? " and " : ", ")}
                        <code className="rounded bg-black/40 px-1">{name}</code>
                      </span>
                    ))}{" "}
                    to <code className="rounded bg-black/40 px-1">.env</code>, then restart <code className="rounded bg-black/40 px-1">npm run dev:all</code>.
                  </p>
                  <a className="mt-2 inline-block underline" href={platform.consoleUrl} target="_blank" rel="noreferrer">
                    Get credentials from {platform.consoleLabel}
                  </a>
                  {platform.key === "youtube" && (
                    <p className="mt-2 text-xs text-muted">Create an OAuth client of type Web application and add http://localhost:3000/api/auth/youtube/callback as a redirect URI.</p>
                  )}
                </div>
              )}
              <div className="mt-4 grid gap-2">
                {linked.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-2xl bg-black/30 px-3 py-2">
                    <div>
                      <div>{account.displayName}</div>
                      <div className="text-xs text-muted">{account.health === "needs-reconnect" ? "Needs reconnect" : "Token on file"}</div>
                    </div>
                    <button className="btn ghost" onClick={() => remove.mutate(account.id)}>Disconnect</button>
                  </div>
                ))}
                {ready && linked.length === 0 && <p className="text-xs text-muted">No channel linked yet.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return <Suspense fallback={<div className="skeleton h-64" />}><AccountsBody /></Suspense>;
}
