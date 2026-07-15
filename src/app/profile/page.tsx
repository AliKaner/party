"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { setToken, useRequireAuth } from "@/lib/auth";

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="anim-pop-in flex flex-col gap-1"
      style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 16, padding: 18 }}
    >
      <span className="font-display" style={{ fontSize: 28, fontWeight: 700, color: color ?? "var(--text)" }}>
        {value}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)" }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { token, me, loading } = useRequireAuth();
  const router = useRouter();
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatar = useMutation(api.users.setAvatar);
  const logout = useMutation(api.users.logout);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  if (loading || !me || !token) return null;

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = await res.json();
      await setAvatar({ token, storageId });
    } catch {
      setUploadError("Upload failed — try again.");
    } finally {
      setUploading(false);
    }
  };

  const fastest =
    me.fastestAnswerMs != null ? `${(me.fastestAnswerMs / 1000).toFixed(1)}s` : "—";

  return (
    <AppShell>
      <div className="mx-auto w-full flex flex-col gap-7" style={{ maxWidth: 620, padding: "30px 24px 48px" }}>
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="relative cursor-pointer"
            style={{ background: "none", border: "none", padding: 0 }}
            title="Change profile photo"
            onClick={() => fileRef.current?.click()}
          >
            <Avatar name={me.username} hue={me.avatarHue} url={me.avatarUrl} size={88} />
            <span
              className="absolute flex items-center justify-center"
              style={{
                right: -2,
                bottom: -2,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--accent)",
                border: "3px solid var(--bg)",
                fontSize: 14,
              }}
              aria-hidden
            >
              📷
            </span>
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{me.username}</h1>
            <button
              type="button"
              className="cursor-pointer self-start"
              style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontSize: 12.5, fontWeight: 800 }}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : me.avatarUrl ? "Change profile photo" : "Add a profile photo"}
            </button>
            {uploadError && (
              <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700 }}>{uploadError}</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <StatCard label="Games Played" value={String(me.gamesPlayed)} />
          <StatCard label="Games Won" value={String(me.gamesWon)} color="var(--success)" />
          <StatCard label="Daily Streak" value={String(me.dailyStreak)} color="var(--warning)" />
          <StatCard label="Fastest Answer" value={fastest} color="var(--accent)" />
        </div>

        <section className="flex flex-col gap-3">
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>
            WORD OF THE DAY HISTORY
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {me.dailyHistory.length ? (
              me.dailyHistory.map((h, i) => (
                <span
                  key={`${h.date}-${i}`}
                  title={`${h.date} — ${h.won ? "won" : "missed"}`}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: h.won ? "var(--success)" : "var(--hairline)",
                  }}
                />
              ))
            ) : (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--faint)" }}>
                No daily puzzles played yet.
              </span>
            )}
          </div>
        </section>

        <button
          className="pb-btn pb-btn-ghost self-start"
          onClick={() => {
            void logout({ token });
            setToken(null);
            router.replace("/");
          }}
        >
          LOG OUT
        </button>
      </div>
    </AppShell>
  );
}
