# Level Up 🎮💪

A 12-week training plan that plays like a game. It's a Progressive Web App (PWA): it installs on your iPhone home screen, works offline, and keeps all your data on your phone. It's free, with no accounts and no servers.

**Stack:** React + TypeScript + Vite, Tailwind, Dexie (IndexedDB), Recharts, vite-plugin-pwa. Hosted free on GitHub Pages.

---

## Run it on your computer

```bash
npm install        # first time only
npm run dev        # start the app → open http://localhost:5173/level-up/
npm test           # run the tests (progression engine, Life Happens rules, game logic)
npm run build      # production build into dist/
npm run preview    # serve the production build → http://localhost:4173/level-up/
```

Before 16 Nov 2026 the app shows a countdown. To try workouts now, go to **More → Time travel**, pick a date like 16/11/2026 and tap **Go**. Use **More → Reset everything** afterwards for a clean start.

**Test on your phone before deploying:** run `npm run dev`, then open the "Network" address it prints (e.g. `http://192.168.1.20:5173/level-up/`) in Safari on your iPhone (same Wi-Fi). Offline mode and installing only work on the real HTTPS site.

---

## Deploy to GitHub Pages (one-time setup)

0. **Set your git name + private email** (so your real email isn't public). On GitHub go to **Settings → Emails**, tick **Keep my email addresses private**, and copy the address that looks like `12345678+username@users.noreply.github.com`. Then in this folder:
   ```bash
   git config user.name "Your Name"
   git config user.email "12345678+username@users.noreply.github.com"
   ```
1. Create a free account at <https://github.com> if you haven't already.
2. Click **+ → New repository**. Name it exactly **`level-up`**, make it **Public**, and **don't** add a README. Click **Create repository**.
3. In the terminal, inside this folder:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/level-up.git
   git push -u origin main
   ```
   The first time, git asks you to sign in. Choose the browser option, or use a [personal access token](https://github.com/settings/tokens) as the password.
4. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Open the **Actions** tab. The "Deploy to GitHub Pages" run takes about a minute. When it shows a green tick, your app is live at
   **`https://YOUR-USERNAME.github.io/level-up/`**

After that, every `git push` to `main` re-deploys automatically. Open the app and you'll see **"Update available"**. Tap **Update**. Your data stays.

> Using a different repo name? Change `BASE` in `vite.config.ts` and `basePath` in `pwa-assets.config.ts` to `/your-name/`.

---

## Install on your iPhone

1. Open `https://YOUR-USERNAME.github.io/level-up/` in **Safari** (not Chrome).
2. Tap **Share** (the square with the arrow ⬆️; tap **⋯** first if you see it).
3. Scroll down and tap **Add to Home Screen** → **Add**.
4. Open **Level Up** from your home screen. It runs full-screen and works offline from then on.

⚠️ On iPhone, the home-screen app and Safari keep **separate** data. Always log from the home-screen icon.

---

## Reminders (no push notifications needed)

iPhone web apps can't send notifications for free, so Level Up uses your **Calendar** instead:

- At the **Sunday check-in**, plan next week's times and places, and leave "Add to my Calendar" on. iOS opens the file. Tap **Add All**.
- Each session gets two alerts: **8pm the night before** (pack your bag) and **1 hour before**.
- If the file doesn't open straight into Calendar: Share → **Save to Files** → open it in Files → **Add All**.
- **More → Times, places & reminders** sets your default times and can add the whole plan at once. Use either this or the weekly export, not both, or you'll get duplicate events.

---

## Backups (important!)

Your data lives only on your phone, and iOS can delete website data. Every Sunday the check-in reminds you to back up:

- **More → Export backup** opens the share sheet → **Save to Files** → iCloud Drive.
- **More → Import / restore** picks that file and restores everything (it replaces what's on the phone).

---

## Change the plan

Everything about the program is in **`src/config/program.ts`**: dates, phases, sessions, sets/reps/rest, warm-up, mobility, tests. The game settings (XP values, levels, titles, unlocks, raids, achievements, stat formulas) are in **`src/config/game.ts`**. Edit a file, `git push`, and tap Update on your phone.

If you ever change the database structure (`src/db/db.ts`), add a **new** `this.version(2).stores(...)`. Never edit version 1. That way your existing data is migrated, not lost.

To change the icon, edit `public/icon.svg` and run `npm run generate-assets` (then delete the `apple-splash-landscape-*` files, which aren't used).

---

## How it works (for the curious)

| Thing | Where |
|---|---|
| Today's plan + shifting missed sessions | `src/lib/schedule.ts` |
| Life Happens options | `src/lib/life.ts` |
| Weight suggestions (double progression) | `src/lib/progression.ts` |
| XP, levels, streaks, quests, achievements | `src/lib/game.ts` (all calculated from your logs) |
| Melbourne dates (no UTC off-by-one) | `src/lib/dates.ts` |
| Rest timer (timestamp-based) | `src/state/timer.tsx` |
| Backup / restore | `src/lib/backup.ts` |
| Calendar export (.ics) | `src/lib/ics.ts`, `src/lib/calendarEvents.ts` |
| Comeback quest, light-week coach | `src/lib/game.ts`, `src/lib/coach.ts` |
| Weekly share card | `src/lib/shareCard.ts` |
| Food quest + bulk menu | `FOOD` in `src/config/game.ts` |
