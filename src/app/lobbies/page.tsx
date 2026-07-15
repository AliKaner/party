"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import ModeCards from "@/components/ModeCards";
import { GameMode, MODES, hueColor } from "@/lib/constants";
import { useRequireAuth } from "@/lib/auth";
import { ensureAudio } from "@/lib/sounds";

const QUICK_ACCESS = [
  { title: "Solo Practice", desc: "Drill on your own — no pressure.", hue: 300, href: "/practice", glyph: "●" },
  { title: "Word of the Day", desc: "One daily word. Keep the streak.", hue: 85, href: "/daily", glyph: "◆" },
  { title: "Word Spies", desc: "Team word deduction — Codenames-style.", hue: 220, href: "?create=wordspies", glyph: "■" },
  { title: "Word Bluff", desc: "Invent definitions, fool your friends.", hue: 25, href: "/bluff", glyph: "▲" },
  { title: "Quizzes", desc: "Play or build picture quizzes.", hue: 190, href: "/quizzes", glyph: "▦" },
];

type RoomListItem = NonNullable<ReturnType<typeof useRoomList>>[number];

function useRoomList() {
  return useQuery(api.rooms.list, {});
}

function GlyphBadge({ glyph }: { glyph: string }) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center"
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        fontSize: 11,
        background: "oklch(0.15 0.02 280 / 0.4)",
        color: "white",
      }}
    >
      {glyph}
    </span>
  );
}

function RoomCard({ room, onJoin }: { room: RoomListItem; onJoin: (id: Id<"rooms">) => void }) {
  const hue = useMemo(() => {
    let h = 0;
    for (const ch of room.name) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return [300, 220, 145, 25, 85, 255, 10, 190][h % 8];
  }, [room.name]);
  const inProgress = room.status === "in_progress";
  const modeLabel = MODES.find((m) => m.key === room.mode)?.title ?? room.mode;
  return (
    <div
      className="anim-pop-in flex flex-col overflow-hidden"
      style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: 18 }}
    >
      <div
        className="relative"
        style={{
          height: 64,
          background: `linear-gradient(135deg, ${hueColor(hue, 0.45, 0.13)}, ${hueColor((hue + 40) % 360, 0.3, 0.09)})`,
        }}
      >
        <div
          className="absolute flex items-center gap-1.5"
          style={{
            top: 10,
            left: 12,
            background: "oklch(0.15 0.02 280 / 0.55)",
            padding: "4px 9px",
            borderRadius: 100,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
          }}
        >
          <span
            className={inProgress ? undefined : "anim-pulse"}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: inProgress ? "var(--warning)" : "var(--success)",
            }}
          />
          {inProgress ? `IN PROGRESS · ${room.elapsedMin}m ago` : "LIVE"}
        </div>
      </div>
      <div className="flex flex-col gap-2.5" style={{ padding: 14 }}>
        <div>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>{room.name}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{modeLabel}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex">
            {room.previews.map((p, i) => (
              <div key={i} style={{ marginLeft: i ? -8 : 0, border: "2px solid var(--panel)", borderRadius: "50%" }}>
                <Avatar name={p.initial} hue={p.hue} url={p.url} size={26} />
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{room.playerCount}/16</span>
        </div>
        <div style={{ height: 5, borderRadius: 100, background: "var(--hairline)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, (room.playerCount / 16) * 100)}%`,
              height: "100%",
              borderRadius: 100,
              background: inProgress ? "var(--warning)" : "var(--accent)",
            }}
          />
        </div>
        <button
          className="pb-btn"
          style={{ padding: "10px 14px", fontSize: 13, background: inProgress ? "var(--hairline)" : undefined, color: inProgress ? "var(--faint)" : undefined }}
          disabled={inProgress}
          onClick={() => onJoin(room.id)}
        >
          {inProgress ? "IN PROGRESS" : "JOIN"}
        </button>
      </div>
    </div>
  );
}

function CreateLobbyModal({
  initialMode,
  onClose,
}: {
  initialMode: GameMode;
  onClose: () => void;
}) {
  const { token, me } = useRequireAuth();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const create = useMutation(api.rooms.create);
  const router = useRouter();

  const submit = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const { roomId } = await create({ token, name: name || `${me?.username ?? "New"}'s Room`, mode });
      router.push(`/room/${roomId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-5">
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
          CREATE LOBBY
        </h2>
        <input
          className="pb-input"
          placeholder="Room name"
          value={name}
          maxLength={30}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        />
        <div className="flex flex-col gap-2">
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)" }}>GAME MODE</span>
          <ModeCards selected={mode} onSelect={setMode} />
        </div>
        <button className="pb-btn" disabled={busy} onClick={() => void submit()}>
          CREATE &amp; JOIN
        </button>
      </div>
    </Modal>
  );
}

function LobbiesInner() {
  const { token, me, loading } = useRequireAuth();
  const rooms = useRoomList();
  const join = useMutation(api.rooms.join);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<GameMode>("letter");

  useEffect(() => {
    ensureAudio();
  }, []);

  // "Word Spies" nav/quick-access navigates to ?create=wordspies, which opens
  // the Create Lobby modal pre-set to Word Spies (that mode always needs a room).
  const forcedSpies = searchParams.get("create") === "wordspies";
  const modalOpen = createOpen || forcedSpies;
  const modalMode: GameMode = forcedSpies ? "wordspies" : createMode;
  const closeModal = () => {
    setCreateOpen(false);
    if (forcedSpies) router.replace("/lobbies");
  };

  if (loading || !me) return null;

  const onJoin = async (roomId: Id<"rooms">) => {
    if (!token) return;
    await join({ token, roomId });
    router.push(`/room/${roomId}`);
  };

  const regular = (rooms ?? []).filter((r) => r.mode !== "wordspies");
  const spies = (rooms ?? []).filter((r) => r.mode === "wordspies");

  return (
    <AppShell activeKey="lobbies">
      <div className="mx-auto w-full flex flex-col gap-7" style={{ maxWidth: 1060, padding: "24px 28px 48px" }}>
        <div className="flex flex-wrap gap-3.5">
          {QUICK_ACCESS.map((qa) => {
            const card = (
              <div
                className="anim-pop-in flex flex-col gap-1.5 h-full"
                style={{
                  background: `linear-gradient(135deg, ${hueColor(qa.hue, 0.42, 0.12)}, ${hueColor(qa.hue, 0.24, 0.06)})`,
                  border: "1px solid var(--border-strong)",
                  borderRadius: 16,
                  padding: 16,
                  minWidth: 190,
                  cursor: "pointer",
                }}
              >
                <GlyphBadge glyph={qa.glyph} />
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{qa.title}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.85 0.02 280)" }}>{qa.desc}</div>
              </div>
            );
            return qa.href.startsWith("?") ? (
              <button
                key={qa.title}
                type="button"
                className="flex-1 text-left"
                style={{ background: "none", border: "none", padding: 0 }}
                onClick={() => { setCreateMode("wordspies"); setCreateOpen(true); }}
              >
                {card}
              </button>
            ) : (
              <Link key={qa.title} href={qa.href} className="flex-1">
                {card}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>
              ONLINE LOBBIES
            </h2>
            <button
              className="pb-btn pb-btn-pill"
              onClick={() => { setCreateMode("letter"); setCreateOpen(true); }}
            >
              + CREATE LOBBY
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            Pick a room and jump in — everyone in a room plays the same live round together.
          </p>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {regular.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={onJoin} />
          ))}
          {!regular.length && (
            <div style={{ color: "var(--faint)", fontSize: 13, fontWeight: 600, padding: "18px 0" }}>
              No live rooms right now — create one!
            </div>
          )}
        </div>

        <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>
          WORD SPIES LOBBIES
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {spies.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={onJoin} />
          ))}
          {!spies.length && (
            <div style={{ color: "var(--faint)", fontSize: 13, fontWeight: 600, padding: "6px 0" }}>
              No Word Spies rooms yet.
            </div>
          )}
        </div>
      </div>

      {modalOpen && <CreateLobbyModal initialMode={modalMode} onClose={closeModal} />}
    </AppShell>
  );
}

export default function LobbiesPage() {
  return (
    <Suspense fallback={null}>
      <LobbiesInner />
    </Suspense>
  );
}
