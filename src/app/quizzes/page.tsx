"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useRequireAuth } from "@/lib/auth";
import { hueColor } from "@/lib/constants";

export default function QuizzesPage() {
  const { token, me, loading } = useRequireAuth();
  const quizzes = useQuery(api.quizzes.list, {});
  const remove = useMutation(api.quizzes.remove);

  if (loading || !me) return null;

  return (
    <AppShell activeKey="quizzes">
      <div className="mx-auto w-full flex flex-col gap-6" style={{ maxWidth: 1060, padding: "26px 28px 48px" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
              QUIZZES
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>
              Build your own picture quiz — or play one from the community.
            </p>
          </div>
          <Link href="/quizzes/create" className="pb-btn pb-btn-pill" style={{ textDecoration: "none" }}>
            + CREATE QUIZ
          </Link>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {(quizzes ?? []).map((quiz) => (
            <div
              key={quiz.id}
              className="anim-pop-in flex flex-col overflow-hidden"
              style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: 18 }}
            >
              <div
                style={{
                  height: 110,
                  background: quiz.coverUrl
                    ? undefined
                    : `linear-gradient(135deg, ${hueColor(quiz.ownerHue, 0.45, 0.13)}, ${hueColor((quiz.ownerHue + 60) % 360, 0.28, 0.08)})`,
                  overflow: "hidden",
                }}
              >
                {quiz.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quiz.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div className="flex flex-col gap-2.5" style={{ padding: 14 }}>
                <div>
                  <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>{quiz.title}</div>
                  {quiz.description && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginTop: 2 }}>
                      {quiz.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar name={quiz.ownerName} hue={quiz.ownerHue} size={22} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{quiz.ownerName}</span>
                  <span className="flex-1" />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--faint)" }}>
                    {quiz.questionCount} Q · {quiz.plays} plays
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/quizzes/${quiz.id}`} className="pb-btn flex-1 text-center" style={{ padding: "10px 14px", fontSize: 13, textDecoration: "none" }}>
                    PLAY
                  </Link>
                  {quiz.ownerId === me.id && token && (
                    <button
                      className="pb-btn pb-btn-ghost"
                      style={{ padding: "10px 14px", fontSize: 13 }}
                      onClick={() => {
                        if (confirm(`Delete "${quiz.title}"?`)) {
                          void remove({ token, quizId: quiz.id as Id<"quizzes"> });
                        }
                      }}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {quizzes && !quizzes.length && (
            <div style={{ color: "var(--faint)", fontSize: 13, fontWeight: 600, padding: "18px 0" }}>
              No quizzes yet — be the first to create one!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
