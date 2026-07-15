"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import WordCloudBg from "@/components/WordCloudBg";
import { getToken, hashPassword, setToken } from "@/lib/auth";
import { generateGuestName } from "@/lib/constants";
import { ensureAudio } from "@/lib/sounds";

function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return "Something went wrong. Try again.";
}

export default function AuthPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useMutation(api.users.login);
  const register = useMutation(api.users.register);

  useEffect(() => {
    if (getToken()) router.replace("/lobbies");
  }, [router]);

  // Username prefilled with an auto-generated guest name the user can edit.
  // Generated after mount (deferred) so the server-prerendered HTML matches
  // the first client render.
  useEffect(() => {
    const t = setTimeout(() => {
      setUsername((u) => (u ? u : generateGuestName()));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    setError("");
    setBusy(true);
    ensureAudio();
    try {
      const passwordHash = await hashPassword(email, password);
      const result =
        screen === "login"
          ? await login({ email, passwordHash })
          : await register({ username, email, passwordHash });
      setToken(result.token);
      router.replace("/lobbies");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative hidden md:flex flex-1 items-center justify-center overflow-hidden">
        <WordCloudBg />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">
          <span className="font-logo" style={{ fontSize: 34, letterSpacing: "0.06em" }}>
            PARTY BOX
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "oklch(0.9 0.02 300)" }}>
            Think fast, survive.
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ background: "var(--bg)" }}>
        <div className="w-full flex flex-col gap-4" style={{ maxWidth: 360 }}>
          <span className="font-logo md:hidden self-center" style={{ fontSize: 24, marginBottom: 8 }}>
            PARTY BOX
          </span>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            {screen === "login" ? "Log In" : "Create Account"}
          </h1>

          {screen === "register" && (
            <input
              className="pb-input"
              placeholder="Username"
              value={username}
              maxLength={20}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onKeyDown}
            />
          )}
          <input
            className="pb-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <input
            className="pb-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
          />

          {error && (
            <div className="anim-shake" style={{ color: "var(--danger)", fontSize: 13, fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button className="pb-btn w-full" disabled={busy} onClick={() => void submit()}>
            {screen === "login" ? "LOG IN" : "CREATE ACCOUNT"}
          </button>

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            {screen === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  className="cursor-pointer"
                  style={{ color: "var(--accent)", fontWeight: 800, background: "none", border: "none", padding: 0, font: "inherit" }}
                  onClick={() => { setScreen("register"); setError(""); }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="cursor-pointer"
                  style={{ color: "var(--accent)", fontWeight: 800, background: "none", border: "none", padding: 0, font: "inherit" }}
                  onClick={() => { setScreen("login"); setError(""); }}
                >
                  Log In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
