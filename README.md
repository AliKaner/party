# Party Box

Real-time multiplayer word party games — think fast, survive. Built with
**Next.js (App Router) + Convex** from the design handoff in `rules.md`
(`Kelime Oyunu.dc.html` prototype).

## Games

- **Online lobbies** — live elimination rooms (Start With a Letter / Word
  Chain / Scrambled Letters): 3 lives, 10s per round, +2s bonus for answers
  under 3s. Rounds, timers, and scoring are **server-authoritative** (Convex
  scheduled functions), so every client in a room sees the same clock.
- **Word Spies** — Codenames-style team deduction (9 blue / 8 red / 7 neutral /
  1 assassin), Red team played by a server-side bot.
- **Word Bluff** — Fibbage-style: invent a fake definition, spot the real one.
- **Word of the Day** — Wordle-style daily puzzle with streaks (per-account,
  persisted in Convex).
- **Solo Practice** — the same elimination game, solo, client-side.
- **Quizzes** — build your own picture quizzes (cover + per-question images
  uploaded to Convex file storage) and play the community's.

Accounts support **profile photo upload** (Convex storage); avatars fall back
to an initial on an auto-assigned hue.

## Development

```bash
npm install
npx convex dev   # terminal 1 — pushes convex/ functions, watches for changes
npm run dev      # terminal 2 — Next.js dev server
```

`NEXT_PUBLIC_CONVEX_URL` / `CONVEX_DEPLOYMENT` live in `.env.local`.

## Layout

- `convex/` — schema + server functions (auth, rooms, game loop, spies bot,
  daily word, quizzes, uploads)
- `src/lib/words.ts` — shared word list + helpers (used by client **and**
  Convex for authoritative validation)
- `src/lib/sounds.ts` — synthesized WebAudio cues (no audio files)
- `src/components/game/` — shared game screens (elimination view, results,
  Word Spies board)
- `src/app/` — routes: `/` (auth), `/lobbies`, `/room/[id]`, `/practice`,
  `/daily`, `/bluff`, `/profile`, `/quizzes`, `/quizzes/create`,
  `/quizzes/[id]`

> Note: auth is demo-grade (client-hashed password, session token in
> localStorage) — fine for a party game, not for anything sensitive.
