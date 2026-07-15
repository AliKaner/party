"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AppShell from "@/components/AppShell";
import { useRequireAuth } from "@/lib/auth";
import { ensureAudio, playSound } from "@/lib/sounds";

export default function PlayQuizPage() {
  const params = useParams<{ id: string }>();
  const quizId = params.id as Id<"quizzes">;
  const { me, loading } = useRequireAuth();
  const quiz = useQuery(api.quizzes.get, { quizId });
  const recordPlay = useMutation(api.quizzes.recordPlay);

  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    ensureAudio();
  }, []);

  useEffect(() => {
    if (done && !recorded.current) {
      recorded.current = true;
      void recordPlay({ quizId });
    }
  }, [done, recordPlay, quizId]);

  if (loading || !me) return null;
  if (quiz === undefined) return <AppShell activeKey="quizzes" showNav={false} backHref="/quizzes"><div /></AppShell>;
  if (quiz === null) {
    return (
      <AppShell activeKey="quizzes" showNav={false} backHref="/quizzes">
        <div style={{ padding: 40, fontWeight: 700, color: "var(--muted)" }}>Quiz not found.</div>
      </AppShell>
    );
  }

  const question = quiz.questions[qi];

  const pick = (oi: number) => {
    if (picked !== null || !question.options[oi]?.trim()) return;
    setPicked(oi);
    const correct = oi === question.correct;
    playSound(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (qi + 1 >= quiz.questions.length) {
      playSound(score >= quiz.questions.length / 2 ? "win" : "eliminate");
      setDone(true);
    } else {
      setQi((i) => i + 1);
      setPicked(null);
    }
  };

  if (done) {
    return (
      <AppShell activeKey="quizzes" showNav={false} backHref="/quizzes">
        <div className="mx-auto w-full flex flex-col items-center gap-4 text-center" style={{ maxWidth: 480, padding: "60px 24px" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--muted)" }}>QUIZ COMPLETE</span>
          <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>
            {score} / {quiz.questions.length}
          </h1>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>
            {quiz.title} — by {quiz.ownerName}
          </p>
          <div className="flex gap-3" style={{ marginTop: 16 }}>
            <button
              className="pb-btn"
              onClick={() => { setQi(0); setPicked(null); setScore(0); setDone(false); recorded.current = false; }}
            >
              PLAY AGAIN
            </button>
            <Link href="/quizzes" className="pb-btn pb-btn-ghost" style={{ textDecoration: "none" }}>
              ALL QUIZZES
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeKey="quizzes" showNav={false} backHref="/quizzes">
      <div className="mx-auto w-full flex flex-col gap-5" style={{ maxWidth: 560, padding: "26px 24px 48px" }}>
        <div className="flex items-center justify-between">
          <h1 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{quiz.title}</h1>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)" }}>
            {qi + 1} / {quiz.questions.length}
          </span>
        </div>

        <div style={{ height: 6, borderRadius: 100, background: "var(--hairline)", overflow: "hidden" }}>
          <div style={{ width: `${((qi + (picked !== null ? 1 : 0)) / quiz.questions.length) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 100, transition: "width 0.3s" }} />
        </div>

        <div key={qi} className="anim-pop-in flex flex-col gap-4">
          {question.imageUrl && (
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border-strong)", maxHeight: 280 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={question.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>{question.text}</h2>

          <div className="flex flex-col gap-2.5">
            {question.options.map((opt, oi) => {
              if (!opt.trim()) return null;
              const isCorrect = oi === question.correct;
              const isPicked = picked === oi;
              const revealed = picked !== null;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={revealed}
                  onClick={() => pick(oi)}
                  className="text-left cursor-pointer"
                  style={{
                    background: revealed && isCorrect
                      ? "oklch(0.78 0.19 145 / 0.15)"
                      : revealed && isPicked
                        ? "oklch(0.62 0.2 25 / 0.15)"
                        : "var(--panel)",
                    border: `2px solid ${
                      revealed && isCorrect
                        ? "var(--success)"
                        : revealed && isPicked
                          ? "var(--danger)"
                          : "var(--border-strong)"
                    }`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {opt}
                  {revealed && isCorrect && (
                    <span style={{ marginLeft: 8, color: "var(--success)", fontWeight: 800 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <button className="pb-btn self-start" onClick={next}>
              {qi + 1 >= quiz.questions.length ? "SEE RESULT" : "NEXT QUESTION"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
