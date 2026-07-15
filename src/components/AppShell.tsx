"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ambient from "./Ambient";
import Avatar from "./Avatar";
import { useMe } from "@/lib/auth";

const NAV_ITEMS = [
  { key: "lobbies", label: "Online", href: "/lobbies" },
  { key: "practice", label: "Solo Practice", href: "/practice" },
  { key: "daily", label: "Word of the Day", href: "/daily" },
  { key: "wordspies", label: "Word Spies", href: "/lobbies?create=wordspies" },
  { key: "bluff", label: "Word Bluff", href: "/bluff" },
  { key: "quizzes", label: "Quizzes", href: "/quizzes" },
];

export function Wordmark({ size = 15 }: { size?: number }) {
  return (
    <span
      className="font-logo"
      style={{ fontSize: size, letterSpacing: "0.06em", color: "var(--text)" }}
    >
      PARTY BOX
    </span>
  );
}

export function ProfileChip() {
  const { me } = useMe();
  if (!me) return null;
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.5"
      style={{
        background: "var(--chip)",
        border: "1px solid var(--border-strong)",
        borderRadius: 100,
        padding: "4px 14px 4px 4px",
      }}
    >
      <Avatar name={me.username} hue={me.avatarHue} url={me.avatarUrl} size={34} />
      <span className="text-[13px] font-bold">{me.username}</span>
    </Link>
  );
}

export function HeaderBar({
  backHref,
  showNav = true,
  activeKey,
}: {
  backHref?: string;
  showNav?: boolean;
  activeKey?: string;
}) {
  const pathname = usePathname();
  return (
    <>
      <header
        className="flex items-center justify-between relative z-10"
        style={{ padding: "16px 28px", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back"
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                color: "var(--muted)",
                fontSize: 18,
              }}
            >
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none" aria-hidden>
                <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <Link href="/lobbies">
            <Wordmark />
          </Link>
        </div>
        <ProfileChip />
      </header>
      {showNav && (
        <nav
          className="flex gap-2 overflow-x-auto relative z-10"
          style={{ padding: "10px 28px", borderBottom: "1px solid var(--hairline)" }}
        >
          {NAV_ITEMS.map((item) => {
            const active = activeKey
              ? activeKey === item.key
              : pathname.startsWith(item.href.split("?")[0]) && item.key !== "wordspies";
            return (
              <Link
                key={item.key}
                href={item.href}
                className="whitespace-nowrap"
                style={{
                  padding: "8px 16px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 700,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "white" : "var(--muted)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}

export default function AppShell({
  children,
  activeKey,
  showNav = true,
  backHref,
}: {
  children: React.ReactNode;
  activeKey?: string;
  showNav?: boolean;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Ambient />
      <HeaderBar backHref={backHref} showNav={showNav} activeKey={activeKey} />
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
