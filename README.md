# Study Timer

A laptop-friendly study logger: one timer per subject, start and stop it as you work, see
how long you studied each subject each day. Data lives in your browser's localStorage — no
account, no server, works offline.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Put it online (GitHub Pages)

1. Push this to a GitHub repo.
2. `npm run deploy` — builds and pushes `dist/` to a `gh-pages` branch.
3. In the repo settings, set Pages to serve from the `gh-pages` branch.

`base: './'` in `vite.config.js` is what makes it work from a `/repo-name/` sub-path.

## What it does

- Start/stop a timer per subject; only one runs at a time, and starting a second one closes
  the first.
- The running time is recomputed from the stored start timestamp, so closing the tab,
  sleeping the laptop, or a throttled background tab won't lose or distort time.
- Live elapsed time shows in the browser tab title.
- Today view: per-subject totals with bars, plus the day's grand total.
- History view: totals over 7/30/all days, then every session grouped by day.
- Manual entry for sessions you forgot to time.
- CSV export of the full history, plus a JSON backup you can restore.
- Configurable day start (default 04:00), so a session at 01:30 counts towards the night
  before rather than the new date.

## Data model

One object under the `study-timer-v1` key:

```js
{
  subjects: [{ id, name, color, archived }],
  sessions: [{ id, subjectId, startedAt, endedAt, seconds, note }],
  running:  { subjectId, startedAt } | null,
  settings: { dayStartHour: 4 }
}
```

A session is attributed to the study day its **start** falls in. Hiding a subject keeps its
sessions in the history.

## Files

```
src/
  App.jsx                   state, persistence, timer logic
  storage.js                localStorage, time formatting, CSV
  styles.css
  components/TodayView.jsx
  components/HistoryView.jsx
```

## Known limits

- localStorage is per-browser and per-device. Clearing site data wipes it — take the JSON
  backup now and then.
- A session that runs past midnight counts entirely towards its start day.
