# Trainer

Vue 3 + Vite Webapp für Triathlon-Pläne. Paces kommen aus Strava-Bestleistungen (VDOT, FTP, CSS), der Kalender aus Periodisierung — nicht aus einer KI.

## Schnellstart

```bash
npm install
copy .env.example .env
npm run dev
```

Ohne Keys: **Demo starten**. Dann siehst du Paces, Schwellen und den Kalender mit Beispieldaten.

## Strava (optional)

1. App unter https://www.strava.com/settings/api anlegen
2. Authorization Callback Domain: `localhost`
3. In `.env` eintragen:

```
VITE_STRAVA_CLIENT_ID=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=http://localhost:5173/api/strava/callback
APP_URL=http://localhost:5173
```

Der Vite-Devserver stellt `/api/strava/*` selbst bereit (Token-Tausch, Sync). Refresh-Token liegt im HttpOnly-Cookie.

## Daten

Plan, Paces und Aktivitäten liegen im Browser (`localStorage`). Für eine Person-App reicht das. Kein Supabase nötig.

Falls du später Handy + Laptop syncen willst: **Neon** (Postgres, eigener Free-Tier, passt zu Vercel) oder **Turso** (SQLite).

## Vercel

- Root: dieses Repo
- Env: dieselben Variablen, `APP_URL` und `STRAVA_REDIRECT_URI` auf die Produktivdomain
- Strava Callback Domain: deine Domain ohne `https://`

## Was schon da ist

- Onboarding: Distanz, Datum, Stunden, Wochentage
- Analyse letzter 12 Wochen: Lauf-Schwelle / VDOT, FTP, CSS
- Plan: Base → Build → Peak → Taper, Key-Sessions, Easy/Hart, Brick
- Kalender + Workout-Struktur für die Uhr

## Als Nächstes

- intervals.icu → Coros Pace 4
- Plan vs. Ist nach jedem Strava-Sync
- Optional Cloud-Sync (Neon/Turso), wenn localStorage nicht reicht
