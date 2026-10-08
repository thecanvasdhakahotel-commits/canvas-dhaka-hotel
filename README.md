# The Canvas Dhaka Hotel — Hotel Management System

Full-stack hotel management app for **The Canvas Dhaka Hotel** (Uttara, Dhaka).

## Features

- **Front Desk dashboard** — live room status by floor (available / reserved / occupied / cleaning / maintenance), arrivals & departures today
- **New Booking** — clicking *New Booking* opens the **Guest Registration Card** popup; staff fill in guest details, pick a room and dates, and hit **Confirm Booking** — the booking is created and the registration card is linked automatically (rate, nights and VAT 15% are calculated for you)
- **Registration Cards** — full guest registration card records (passport/NID, visa dates, tariff, payment mode), printable view
- **Bookings** — check-in / check-out / cancel, Excel export
- **Restaurant POS** — menu orders with service charge (10%) + VAT (15%)
- **Reports** — revenue, VAT and occupancy summaries with Excel export
- **Settings** — room & menu management (admin), staff accounts
- **Auth** — staff login (default admin: `admin / admin123`, staff: `staff / staff123` — change after first login)

## Tech stack

React 19 + TypeScript + Vite + Tailwind + shadcn/ui · Hono + tRPC 11 · Drizzle ORM + MySQL

## Local development

```bash
npm install
cp .env.example .env   # fill in APP_ID, APP_SECRET, DATABASE_URL
npm run db:push        # create tables
npx tsx db/seed.ts     # seed rooms, menu and staff users
npm run dev            # http://localhost:3000
```

## Deploy to Vercel (from GitHub)

1. Push this repo to GitHub (`git init && git add . && git commit -m "init" && git remote add origin <repo-url> && git push -u origin main`).
2. Create a MySQL database (e.g. PlanetScale, TiDB Cloud, Aiven) and copy its connection string.
3. In Vercel → **Add New Project** → import the GitHub repo. `vercel.json` is already configured (frontend build + serverless API at `api/vercel.ts`).
4. Add environment variables in Vercel project settings:
   - `DATABASE_URL` — your MySQL connection string
   - `APP_ID` / `APP_SECRET` — any random strings (APP_SECRET signs login sessions)
5. Deploy, then from your local machine (with the same `DATABASE_URL` in `.env`) run:

   ```bash
   npm run db:push
   npx tsx db/seed.ts
   ```

6. Open the Vercel URL and log in.

## Self-host (Docker)

```bash
docker build -t canvas-hotel .
docker run -p 3000:3000 --env-file .env canvas-hotel
```
