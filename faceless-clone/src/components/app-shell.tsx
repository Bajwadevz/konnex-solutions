"use client";

import { Clapperboard, Film, LayoutDashboard, Music, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board", icon: LayoutDashboard },
  { href: "/videos", label: "Videos", icon: Film },
  { href: "/accounts", label: "Accounts", icon: Share2 },
  { href: "/music", label: "Music", icon: Music },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="relative z-10 min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-white/10 md:flex md:flex-col md:px-5 md:py-6">
        <Link href="/" className="mb-10 block">
          <div className="kicker">Local studio</div>
          <div className="display mt-1 text-4xl leading-none">
            Faceless<span className="ml-1 inline-block h-2 w-2 rounded-full bg-cadmium align-middle" />
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${active ? "bg-white/10" : "text-muted hover:bg-white/5"}`}>
                <Icon size={18} /> {link.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/series/new" className="btn mt-6">
          <Clapperboard size={16} /> New series
        </Link>
        <p className="mt-4 text-xs leading-5 text-muted">No login. No credits. The only limits are your machine and the providers you choose.</p>
      </aside>
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="display text-3xl">Faceless</Link>
          <Link href="/series/new" className="btn">New</Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="chip whitespace-nowrap">{link.label}</Link>
          ))}
        </nav>
      </div>
      <main className="px-4 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
