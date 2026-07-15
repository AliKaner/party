"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AppShell from "@/components/AppShell";
import { useRequireAuth } from "@/lib/auth";

type DraftQuestion = {
  text: string;
  options: string[];
  correct: number;
  file: File | null;
  previewUrl: string | null;
};

function emptyQuestion(): DraftQuestion {
  return { text: "", options: ["", "", "", ""], correct: 0, file: null, previewUrl: null };
}

function ImagePicker({
  previewUrl,
  onPick,
  onClear,
  label,
  height = 120,
}: {
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  label: string;
  height?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="flex items-center justify-center cursor-pointer overflow-hidden"
        style={{
          height,
          borderRadius: 12,
          border: `2px dashed ${previewUrl ? "transparent" : "var(--border-strong)"}`,
          background: "oklch(0.17 0.02 280)",
          color: "var(--faint)",
          fontSize: 12.5,
          fontWeight: 700,
          position: "relative",
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span>📷 {label}</span>
        )}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      </label>
      {previewUrl && (
        <button
          type="button"
          className="cursor-pointer self-start"
          style={{ background: "none", border: "none", padding: 0, color: "var(--danger)", fontSize: 11.5, fontWeight: 800 }}
          onClick={onClear}
        >
          Remove image
        </button>
      )}
    </div>
  );
}

export default function CreateQuizPage() {
  const { token, me, loading } = useRequireAuth();
  const router = useRouter();
  const generateUploadUrl = useMutation(api.quizzes.generateUploadUrl);
  const createQuiz = useMutation(api.quizzes.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<{ file: File; previewUrl: string } | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !me || !token) return null;

  const pickImage = (file: File, apply: (previewUrl: string) => void) => {
    if (!file.type.startsWith("image/")) { setError("Pick an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Images must be under 5 MB."); return; }
    setError("");
    apply(URL.createObjectURL(file));
  };

  const patchQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl({ token });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("upload failed");
    const { storageId } = await res.json();
    return storageId;
  };

  const submit = async () => {
    if (busy) return;
    setError("");
    if (!title.trim()) { setError("Give your quiz a title."); return; }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) { setError(`Question ${i + 1} needs text.`); return; }
      if (q.options.filter((o) => o.trim()).length < 2) {
        setError(`Question ${i + 1} needs at least 2 answers.`);
        return;
      }
      if (!q.options[q.correct]?.trim()) {
        setError(`Question ${i + 1}: the marked correct answer is empty.`);
        return;
      }
    }
    setBusy(true);
    try {
      const coverStorageId = cover ? await uploadFile(cover.file) : undefined;
      const payload = [];
      for (const q of questions) {
        const imageStorageId = q.file ? await uploadFile(q.file) : undefined;
        const options = q.options.map((o) => o.trim());
        payload.push({ text: q.text.trim(), imageStorageId, options, correct: q.correct });
      }
      const { quizId } = await createQuiz({
        token,
        title,
        description: description.trim() || undefined,
        coverStorageId,
        questions: payload,
      });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setError(e instanceof ConvexError && typeof e.data === "string" ? e.data : "Couldn't save the quiz — try again.");
      setBusy(false);
    }
  };

  return (
    <AppShell activeKey="quizzes" showNav={false} backHref="/quizzes">
      <div className="mx-auto w-full flex flex-col gap-6" style={{ maxWidth: 640, padding: "26px 24px 60px" }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
          CREATE QUIZ
        </h1>

        <div className="flex flex-col gap-3">
          <input
            className="pb-input"
            placeholder="Quiz title"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="pb-input"
            placeholder="Short description (optional)"
            value={description}
            maxLength={120}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ImagePicker
            label="Add a cover image"
            previewUrl={cover?.previewUrl ?? null}
            onPick={(f) => pickImage(f, (previewUrl) => setCover({ file: f, previewUrl }))}
            onClear={() => setCover(null)}
          />
        </div>

        {questions.map((q, qi) => (
          <section
            key={qi}
            className="flex flex-col gap-3"
            style={{ background: "var(--panel-alt)", border: "1px solid var(--border-strong)", borderRadius: 18, padding: 18 }}
          >
            <div className="flex items-center justify-between">
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)" }}>
                QUESTION {qi + 1}
              </h2>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="cursor-pointer"
                  style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, fontWeight: 800 }}
                  onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className="pb-input"
              placeholder="Question text"
              value={q.text}
              maxLength={200}
              onChange={(e) => patchQuestion(qi, { text: e.target.value })}
            />
            <ImagePicker
              label="Add a question image (optional)"
              height={140}
              previewUrl={q.previewUrl}
              onPick={(f) => pickImage(f, (previewUrl) => patchQuestion(qi, { file: f, previewUrl }))}
              onClear={() => patchQuestion(qi, { file: null, previewUrl: null })}
            />
            <div className="flex flex-col gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    title="Mark as the correct answer"
                    className="cursor-pointer flex items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: `2px solid ${q.correct === oi ? "var(--success)" : "var(--border-strong)"}`,
                      background: q.correct === oi ? "var(--success)" : "transparent",
                      color: "white",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                    onClick={() => patchQuestion(qi, { correct: oi })}
                  >
                    {q.correct === oi ? "✓" : ""}
                  </button>
                  <input
                    className="pb-input"
                    placeholder={`Answer ${oi + 1}${oi < 2 ? "" : " (optional)"}`}
                    value={opt}
                    maxLength={80}
                    onChange={(e) =>
                      patchQuestion(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })
                    }
                  />
                </div>
              ))}
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--faint)" }}>
                Tick the circle next to the correct answer.
              </span>
            </div>
          </section>
        ))}

        <button
          type="button"
          className="pb-btn pb-btn-ghost self-start"
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        >
          + ADD QUESTION
        </button>

        {error && (
          <div className="anim-shake" style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button className="pb-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? "SAVING…" : "SAVE QUIZ"}
        </button>
      </div>
    </AppShell>
  );
}
