# Handoff: Party Box — Real-Time Multiplayer Word Party Game

## Overview
Party Box is a real-time, multiplayer word-game platform (party-game vibe, à la Jackbox). Players log in, browse or create live lobbies, and play one of several fast-paced word games together. It also includes a solo daily puzzle (Wordle-style) and a solo practice mode. The target implementation stack is **Next.js (App Router) + Convex** for real-time state (presence, rooms, rounds, timers, scoring) — Convex's reactive queries/mutations replace all the client-side `setTimeout`/bot-simulation logic used in the prototype.

## About the Design Files
The files in this bundle (`Kelime Oyunu.dc.html`, `Landing Page.dc.html`, `wordlist.js`) are **design references built as self-contained HTML prototypes** — they demonstrate exact look, copy, layout, colors, and intended interaction/animation timing. They are NOT production code to copy directly (they use a custom templating runtime, single-player bot simulation instead of real networking, and inline styles instead of a component/CSS system). The task is to **recreate this design in Next.js + Convex**, using idiomatic React components, a real styling approach (Tailwind, CSS Modules, or styled-components — pick one and apply consistently), and Convex schema/functions for all multiplayer state that the prototype currently fakes with bots and timers.

`wordlist.js` (client-side English word list + helpers) IS reusable logic — its exported functions (`isValidWord`, `getRandomLetter`, `randomWordStartingWith`, `scrambleRoundLetters`, `wordFitsLetters`, `getDailyWordForToday`, `BLUFF_WORDS`, `DAILY_WORDS`) can be ported near-verbatim into a shared `lib/words.ts` module and used both client-side (instant feedback) and server-side in Convex mutations (authoritative validation).

## Fidelity
**High-fidelity.** Recreate pixel-close: exact colors (all in `oklch()`), exact type scale/fonts, exact spacing, exact copy, exact timer/animation behavior described below.

## Brand & Design Tokens

**Fonts** (Google Fonts):
- `Bungee` (400) — logo/wordmark "PARTY BOX" only, everywhere it appears (header bars, side panel titles).
- `Space Grotesk` (500/700/800) — all headings, big numerals (countdown), letter/tile cards.
- `Manrope` (400/600/700/800) — all body copy, buttons, inputs, labels.

**Color palette** (dark theme only, `oklch` color space):
- Background base: `oklch(0.15 0.015 280)`
- Panel/card background: `oklch(0.2 0.025 280)`, alt `oklch(0.19 0.025 280)`, header/modal `oklch(0.21 0.025 280)` / `oklch(0.19 0.025 280)`
- Borders: `oklch(0.26 0.02 280)` (hairlines), `oklch(0.3 0.03 280)` (inputs/cards)
- Text: primary `oklch(0.96 0.005 280)`, secondary/muted `oklch(0.66 0.02 280)`, faint `oklch(0.6 0.02 280)`
- Primary accent (brand purple): `oklch(0.62 0.19 300)` — all primary buttons, active nav pill, selected states
- Success/green (correct answers, "LIVE" dot, win state): `oklch(0.78 0.19 145)`
- Warning/amber (bonus time, hints, in-progress badge): `oklch(0.78 0.17 85)`
- Danger/red (errors, elimination, wrong answers, assassin): `oklch(0.62 0.2 25)`
- Avatar/accent hue rotation (used for avatars, room banners, quick-access cards): hues `[300, 220, 145, 25, 85, 255, 10, 190]` at `oklch(0.6 0.19 <hue>)`
- Team colors (Word Spies): Blue `oklch(0.5 0.15 250)`, Red `oklch(0.5 0.18 25)`, Neutral `oklch(0.42 0.02 280)`, Assassin `oklch(0.15 0.01 280)`

**Shape/spacing:** border-radius 10–22px depending on component size (small chips 8–10px, cards 14–18px, pill buttons/badges 100px). Consistent 8/10/12/14/16/20/24/28px spacing scale. Buttons: bold (800 weight), uppercase-ish labels, no icons except a few Unicode glyphs used as tiny badges (●, ◆, ■, ▲, ○, +) — recreate these as small SVG icons for production polish, not literal Unicode characters (this is a known code-smell in the prototype; the developer should upgrade these to real icon components).

**Background texture:** ambient blurred color blobs (`filter: blur(90–110px)` on large absolutely-positioned circles) + a faint 44px grid line pattern over the dark background, used behind every screen. The Login/Register split-screen uses a diagonal-word literary background image (`word-cloud-bg.png`, included) with a purple-to-dark gradient overlay.

## Screens / Views

### 1. Login
Split-screen, full viewport height. Left half: background image (`word-cloud-bg.png`, cover-fit) + a `135deg` gradient overlay from `oklch(0.55 0.19 300 / 0.55)` to `oklch(0.15 0.02 280 / 0.88)`, centered wordmark "PARTY BOX" (Bungee, 34px) + tagline "Think fast, survive." Right half: centered form column, max-width 360px — "Log In" heading (Space Grotesk 800, 28px), Email input, Password input (both dark inputs, 2px border, 12px radius, focus border = accent purple), "LOG IN" primary button (full width, accent purple, 15px radius), footer line "Don't have an account? **Register**" (Register is a purple accent link that switches screens client-side, no page nav).

### 2. Register
Same split-screen shell as Login. Form fields: Username (prefilled with an auto-generated guest name like "Kaan38" that the user can edit), Email, Password, "CREATE ACCOUNT" button, footer link back to Log In. No avatar-color picker (removed by request — avatar color is auto-assigned randomly per user, not user-selectable). On submit, both Login and Register proceed straight into the app (Lobbies/home) — no separate onboarding.

### 3. Home / Online Lobbies (main dashboard after auth)
Persistent app shell used on this + every other non-gameplay screen:
- **Header bar** (16px/28px padding, bottom hairline border): wordmark "PARTY BOX" (Bungee 15px) on the left; on the right a clickable **profile chip** — pill-shaped (`border-radius:100px`, `oklch(0.24 0.025 280)` bg, 1px border) containing a 34px round avatar (initial letter, colored by the user's assigned hue) + username, navigates to Profile.
- **Nav bar** directly below header (10px/28px padding, bottom hairline, horizontal-scrollable on overflow): pill tabs — Online, Solo Practice, Word of the Day, Word Spies, Word Bluff. Active tab = filled accent purple pill; inactive = transparent, muted text. (Note: there is intentionally NO separate "Create Lobby" nav tab — lobby creation happens via the "+ Create Lobby" button described below, opened as a **modal overlay**, not a page.)

Body (scrollable):
1. **Quick access row** — 3–4 side-by-side cards (flex-wrap), one per non-elimination game mode (Solo Practice, Word of the Day, Word Spies, Word Bluff). Each: colored gradient card (`135deg`, tinted by a hue), small icon-glyph badge top-left, bold title, 1-line description. Clicking navigates directly to that mode's screen (Word Spies instead opens the Create Lobby modal pre-set to the Word Spies game mode, since that mode is always played in a room).
2. **"ONLINE LOBBIES" heading row** + **"+ CREATE LOBBY"** pill button (opens the create-lobby modal).
3. Helper line: "Pick a room and jump in — everyone in a room plays the same live round together."
4. **Room grid** (auto-fill, min 240px columns, 16px gap) — regular word-elimination rooms (modes: Start With a Letter / Word Chain / Scrambled Letters). Each room card: colored gradient banner (64px tall) with a "LIVE" pill (pulsing green dot) OR, if the room's match already started, an amber dot + "IN PROGRESS · Xm ago" label (elapsed minutes since the round started) — in-progress rooms are NOT joinable (Join button disabled, greyed, label "IN PROGRESS"); card body: room name, mode label, stacked avatar previews (4, overlapping -8px), player count "N/16", a slim capacity bar, and the Join button.
5. **"WORD SPIES LOBBIES" heading** + a second, separate room grid directly below, same card style, always mode = Word Spies.

### 4. Create Lobby (modal, not a page)
Centered modal over whatever screen is behind it (dim + blurred backdrop, click-outside or × to close). Card: "CREATE LOBBY" title, Room Name text input, Game Mode selector (the same 4 mode cards used elsewhere: Letter / Chain / Anagram / Word Spies — clicking selects, shows purple border + tinted background on the selected card), "CREATE & JOIN" button. Submitting creates a room, marks the current user as **host** of that room, and navigates into the Room Lobby below.

### 5. Room Lobby (pre-game, joined a specific room)
Header: back-chevron + wordmark (chevron returns to Online Lobbies) on the left, profile chip on the right. Below: room name (big heading) + player count. Then, branching by mode:
- **Elimination modes (Letter/Chain/Anagram):** "Game Mode" section showing the 3 mode cards — **only the room host can click to change the mode** (non-hosts see the cards read-only/dimmed plus a note "Only the host can change the game mode."). Below that, a "Players" grid of joined players (avatar, name, "READY" badge).
- **Word Spies mode:** "Game Mode" is shown as a fixed read-only label (mode can't be changed once a Word Spies room exists). Below that, **two side-by-side team rosters** — "BLUE TEAM" / "RED TEAM" headers (blue/red tinted), each listing its players (avatar, name, and a role tag "SPYMASTER" or "OPERATIVE" — exactly one spymaster per team, auto-assigned; the human player is always an Operative on the Blue team).
- **"START GAME"** button at the bottom — any joined player may start (not host-gated in this prototype, to avoid a dead end when no other human is present to click it — but real backend should make this host-gated with a "waiting for host" state for non-hosts, and remove the requirement once a real host is guaranteed to be connected).

### 6. Live Elimination Game (Letter / Chain / Anagram modes)
Full-bleed, minimal header: "ROUND N" left, mode name center, "Leave" right (returns to Online Lobbies, ending the match for the leaving user only in a real multiplayer build).
Two-column body (1fr / 300px sidebar):
- **Left/main column, centered:**
  - **Countdown phase:** giant number (150px, Space Grotesk 800) counting 5→1 then "GO!" (turns green on ≤2 and on GO), each tick plays a short square-wave beep, GO plays a two-note rising chime.
  - **Reveal phase:** the round's prompt appears with a **dramatic flip/reveal animation** (`rotateY` card-flip, ~0.9s) — either a single big letter tile (140×160px, accent-purple rounded card, 76px glyph) for Letter/Chain modes, or a row of smaller letter tiles (56×64px each) for Scrambled Letters mode.
  - **Active phase:** a text input (auto-focused, uppercase, monospace-weight) + SUBMIT button, plus a **countdown bar** below it (14px tall rounded track) that drains from full width over the player's time limit — green while >50% remaining, amber 25–50%, red under 25%; a soft tick sound plays each second under 3s remaining. Answering correctly in **under 3 seconds** grants **+2 seconds of bonus time for the player's next round**, shown as a green "+2s" number that pops up and floats away above the bar (`kw-bonuspop` keyframes: scale+fade in, then floats up and fades out over ~1s), plus a distinct two-note bonus chime.
  - Wrong/duplicate/invalid words show an inline red error message with a horizontal shake animation.
  - **Eliminated state:** once a player runs out of lives, they see a centered "ELIMINATED" message (red, 38px) and a note that other players are still going; their input/prompt UI is hidden but they stay on the screen until the match ends.
- **Right sidebar:**
  - **Players panel:** scrollable list of all players — avatar, name (strikethrough if eliminated, row dimmed to 40% opacity), and **3 heart-shaped life pips** per player (red filled = life remaining, grey = lost) that should visibly deplete as lives are lost.
  - **Feed panel:** a live activity feed (most-recent-first, max ~8 shown) of short lines — "{name}: "{word}" correct" (green), "{name} answered fast, +2s bonus!" (amber), "{name} couldn't find a word (-1 life)" (grey), "{name} eliminated!" (red) — each new line fades/slides in from the right.

Elimination rule: **3 lives**. No answer within the time limit (base 10s + any banked bonus seconds) costs a life; hitting 0 lives eliminates the player. Last player standing wins the match; the match immediately ends (skipping ahead) once only 0–1 active players remain.

### 7. Game End
Centered results screen with a one-shot (non-looping) confetti fall from the top (small colored squares, staggered delay, ~2.4–4s fall+fade, `rotate` as they fall). "GAME OVER" label, "{winner} Wins!" heading, big winner avatar (96px circle with a glowing accent ring). Sections below: "STANDINGS" (ranked list — winner first, then reverse-chronological by elimination round; each row shows rank #, avatar, name, and "Won" / "Eliminated round N"), and "KNOWN WORDS" (every correct word submitted during the match, as colored chips tinted by the submitting player's avatar hue). Footer buttons: "PLAY AGAIN" (primary) and "MAIN MENU" (ghost/outlined) — both return to a fresh state (Online Lobbies for Main Menu).

### 8. Word Spies (Codenames-style team game)
Entered only from a Room Lobby that's in Word Spies mode. Minimal header (back-chevron + wordmark + profile chip, no nav bar — this is focused gameplay like the elimination game).
Body: "WORD SPIES" title + "New Board" text action. A pill banner shows whose turn it is ("Your Team's Turn (Blue)" tinted blue, or "Red Team's Turn" tinted red, or the win message once decided). While it's the Blue (human) team's turn, an amber clue line reads e.g. `Clue: Starts with "C" · 5 letters` (a lightweight, simplified stand-in for a real Spymaster-authored one-word-plus-number clue). A 5×5 grid of word tiles follows standard Codenames composition — **9 cards for the starting (Blue) team, 8 for Red, 7 neutral bystanders, 1 assassin** — tiles are plain dark cards until revealed (or until "SHOW KEY" is toggled, which reveals all colors as a cheat/reference without marking them found). Clicking an unrevealed tile during the Blue team's turn reveals it: correct guesses keep the turn and reveal more of the team's color; a neutral or opposing tile ends the turn immediately; the assassin tile is an **instant loss** for whoever's turn it was. "END TURN" lets the human team voluntarily pass. When it becomes Red's turn, the other (bot) team's operatives auto-reveal tiles on a short delay, mimicking real play (guess, ~55% chance to keep guessing, else pass). First team to reveal all of their color wins.

### 9. Word Bluff (Fibbage-style bluffing game)
Entered from the "Word Bluff" nav item or quick-access card (currently solo-vs-bots; should become a real lobby-based room like the others in production, matching the pattern used for Word Spies). Shows a running "Found N · Fooled N" score. Each round: an obscure English word is displayed big, with its real definition kept secret from the player. **Writing phase:** a textarea for the player to invent a convincing fake definition + "SUBMIT BLUFF". **Voting phase:** the real definition + the player's fake + 3 bot-written fakes are shuffled into a list of clickable cards; the player must pick which one they think is the real definition (their own submission is shown but not selectable). **Result phase:** every card is annotated — "✓ Real definition" (green) on the true one, "{bot name}'s fake" / "Your fake" tags on the rest, plus a reveal of whether the player was correct and how many (simulated) opponents were fooled by the player's own fake — each contributes to the running score. "NEW ROUND" restarts with a new word.

### 10. Word of the Day (Wordle-style, daily puzzle)
Same app shell (header/nav). Title + a category label. A 6-row × N-column (word length, currently 5) grid of letter tiles: green = correct letter+position, amber = correct letter/wrong position, dark grey = absent, outlined-only = not yet guessed; the in-progress row shows the player's current typed letters with a purple outline. After 3 wrong guesses, a hint line appears revealing the middle letter. Guess entry is via an on-screen QWERTY keyboard (3 rows) whose keys recolor to reflect prior guesses (same green/amber/grey logic), plus a text input + "GUESS" button as an alternate input method. On win/loss, a result message appears ("Nice, you found the word!" green, or "Word: {word}" red) and the attempt is locked for the day. **Persistence:** the daily word/progress is keyed by calendar date (so it resets once per day) and the result feeds the Profile's streak counter.

### 11. Solo Practice (setup + reuses the Elimination Game screen)
A lightweight setup screen: mode picker (Letter/Chain/Anagram — same 3 mode cards) + "START PRACTICE" button. Launches the same Elimination Game screen as multiplayer rooms, but with only the human player (no bots, no other lives to watch) — effectively an untimed-pressure solo drill that ends the moment the player's own 3 lives run out.

### 12. Profile
Same app shell. Large 88px avatar + username, then a 2×2 stat-card grid: **Games Played**, **Games Won** (green), **Daily Streak** (amber), **Fastest Answer** (purple, formatted "X.Xs"). Below: "Word of the Day History" — a row of small colored squares (green = won that day, grey = missed/lost), most recent last, capped at the last 14 days.

## Interactions & Behavior Summary
- **Timers:** all countdowns are driven by a 100ms-interval decrement in the prototype; in production these must be **server-authoritative** (Convex scheduled functions / server timestamps) so all clients in a room see the same clock, not a client-local timer.
- **Sounds:** short synthesized WebAudio tones (no audio files) for: countdown tick, "GO", correct answer (two-note rise), wrong answer (descending sawtooth buzz), bonus-time award, elimination (descending buzz), Word Spies tile reveal, Word of the Day win (three-note rising chime). Recreate with either the same synthesized approach or short sound-file equivalents matching the same emotional beats (positive/negative/urgent).
- **Animations to preserve:** card pop-in (scale+fade, staggered by list index), shake on error, letter/tile flip-reveal, pulsing "LIVE" dot, feed lines sliding in, bonus-time number popping and floating away, one-shot confetti fall (not looping) on game end.
- **Validation:** word entries are checked client-side against a bundled English word list (`wordlist.js`) for (a) real-word validity, (b) correct starting letter / chain letter / fits-available-letters, (c) not already used this match. In production, mirror this validation **server-side** (Convex mutation) as the source of truth, with instant client-side pre-validation for responsiveness.
- **Host permission:** only the room's creator (host) may change the game mode while in the Room Lobby; anyone in the room may click Start.

## State Management (prototype → production mapping)
The prototype keeps everything in one component's local state; in Next.js + Convex this should become:
- **Convex tables:** `users` (id, username, avatarHue, stats: gamesPlayed/gamesWon/fastestAnswerMs/dailyStreak/dailyHistory), `rooms` (id, name, mode, hostUserId, status: open/in_progress, createdAt), `roomPlayers` (roomId, userId, team?, role?, lives, status, bankedBonusSeconds), `rounds` (roomId, roundNumber, prompt data, startedAt, per-round per-player resolution), `wordSpiesGames` (roomId, board words/colors/revealed, turn, status), `wordBluffRounds`, `dailyWordProgress` (userId, date, guesses, status).
- **Convex queries/subscriptions** replace all bot-simulation `setTimeout` logic — real other players' actions (or, if bots are still desired for filling empty seats, server-side bot logic) drive round resolution, turn changes, and the activity feed in real time for every connected client.
- **Client state (React/Zustand or plain useState):** current screen/route, in-flight form field values (room name, word input, bluff textarea, daily guess), local animation flags (bonus-pop visibility, shake trigger).

## Assets
- `assets/word-cloud-bg.png` — literary word-cloud background image used (dimmed, gradient-overlaid) on the Login/Register split screen and, at low opacity, in one earlier landing-page hero (see `Landing Page.dc.html` for that usage — optional to carry over).
- Everything else (avatar initials, mode/game icon glyphs, room banners) is generated purely from CSS/color — no other image assets. Note: the current prototype uses plain Unicode glyphs (●, ◆, ■, ▲, ○, +, ‹, ×, ✓) as lightweight icons; production should replace these with a proper icon set (e.g. Lucide/Heroicons) for crispness.

## Files
- `Kelime Oyunu.dc.html` — the full app prototype (Login, Register, Lobbies, Create Lobby modal, Room Lobby, Elimination Game, Game End, Word Spies, Word Bluff, Word of the Day, Solo Practice, Profile). All markup/styling/logic for every screen described above lives in this one file.
- `Landing Page.dc.html` — a separate marketing/landing page (not part of the logged-in app flow) explaining the game's value prop; optional reference if a public landing page is also in scope.
- `wordlist.js` — the English word list + word-game helper functions (validity checks, random letter/word pickers, anagram scrambling, daily word rotation, Word Bluff word/definition + fake-definition pools). Portable near-verbatim into the new codebase.
