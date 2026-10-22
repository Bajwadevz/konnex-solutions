"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/client";
import { ProgressBar, StatusChip } from "@/components/status-chip";

type Series = { id: string; name: string; status: string; nicheKey: string; nextPublishAt: string | null; videos: { id: string; status: string }[] };
type Video = { id: string; title: string | null; status: string; progress: number; series?: { name: string }; createdAt: string };

export default function DashboardPage() {
  const series = useQuery({ queryKey: ["series"], queryFn: () => api<Series[]>("/api/series"), refetchInterval: 3000 });
  const videos = useQuery({ queryKey: ["videos"], queryFn: () => api<Video[]>("/api/videos"), refetchInterval: 3000 });
  const rows = videos.data ?? [];
  const list = series.data ?? [];
  const stats = [
    ["Series", list.length],
    ["Videos", rows.length],
    ["Ready for review", rows.filter((video) => video.status === "READY").length],
    ["Published", rows.filter((video) => video.status === "PUBLISHED").length],
    ["Failed", rows.filter((video) => video.status === "FAILED").length],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Tonight's board</div>
          <h1 className="display text-6xl md:text-7xl">The queue while you sleep.</h1>
        </div>
        <Link href="/series/new" className="btn">Create new series</Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <div className="kicker">{label}</div>
            <div className="display mt-2 text-5xl">{series.isLoading ? "—" : value}</div>
          </div>
        ))}
      </div>
      {!series.isLoading && list.length === 0 && (
        <div className="panel mt-8 p-8">
          <h2 className="display text-4xl">No series yet.</h2>
          <p className="mt-2 max-w-xl text-muted">A series is a niche, a voice, a look, and a schedule. The studio then keeps making videos for it.</p>
          <Link href="/series/new" className="btn mt-5">Create new series</Link>
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="kicker mb-3">Active series</h2>
          <div className="grid gap-3">
            {list.filter((item) => item.status === "ACTIVE").map((item) => (
              <Link key={item.id} href={`/series/${item.id}`} className="panel block p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold">{item.name}</div>
                  <StatusChip status={item.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{item.nicheKey} · next {item.nextPublishAt ? new Date(item.nextPublishAt).toLocaleString() : "unscheduled"}</p>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="kicker mb-3">Recent videos</h2>
          <div className="grid gap-3">
            {rows.slice(0, 8).map((video) => (
              <Link key={video.id} href={`/videos/${video.id}`} className="panel block p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{video.title || "Untitled"}</div>
                    <div className="text-sm text-muted">{video.series?.name}</div>
                  </div>
                  <StatusChip status={video.status} />
                </div>
                <div className="mt-3"><ProgressBar value={video.progress} /></div>
              </Link>
            ))}
            {rows.length === 0 && !videos.isLoading && <p className="text-muted">Videos show up here as soon as a series generates one.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
