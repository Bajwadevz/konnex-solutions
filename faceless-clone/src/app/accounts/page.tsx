"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { api, sendJson } from "@/lib/client";

type Account = { id: string; platform: string; displayName: string; health: string; expiresAt: string | null };

function AccountsBody() {
  const params = useSearchParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["accounts"], queryFn: () => api<Account[]>("/api/accounts") });
  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/accounts/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Disconnected");
      void client.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
  const error = params.get("error");
  const connected = params.get("connected");
  return (
    <div>
      <h1 className="display text-6xl">Accounts</h1>
      <p className="mt-2 max-w-2xl text-muted">Connect a channel when you want auto-posting. The studio is fully usable with none. Publishing defaults to a dry run until you set PUBLISH_DRY_RUN=false.</p>
      {error && <p className="mt-4 rounded-2xl bg-[#ffb4a8] px-4 py-3 text-[#2a0c08]">{error}</p>}
      {connected && <p className="mt-4 text-phosphor">Connected {connected}.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["youtube", "Works locally for Google test users. Unaudited projects may upload as private. Shorts need a vertical video and #Shorts."],
          ["tiktok", "Sandbox can redirect to localhost. Until TikTok audits the app, posts stay private (SELF_ONLY). AI disclosure is on."],
          ["instagram", "Needs a professional account on a Facebook Page, and PUBLIC_BASE_URL so Meta can fetch the MP4. Disabled without that tunnel."],
        ].map(([platform, note]) => (
          <section key={platform} className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold capitalize">{platform}</h2>
              <a className="btn" href={`/api/auth/${platform}/start`}>Connect</a>
            </div>
            <p className="mt-3 text-sm text-muted">{note}</p>
            <div className="mt-4 grid gap-2">
              {(query.data ?? []).filter((account) => account.platform === platform).map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-2xl bg-black/30 px-3 py-2">
                  <div>
                    <div>{account.displayName}</div>
                    <div className="text-xs text-muted">{account.health === "needs-reconnect" ? "Needs reconnect" : "Token on file"}</div>
                  </div>
                  <button className="btn ghost" onClick={() => remove.mutate(account.id)}>Disconnect</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return <Suspense fallback={<div className="skeleton h-64" />}><AccountsBody /></Suspense>;
}
