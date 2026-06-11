# Circadian AI Health Dashboard

> **Local-use tool only.** This app has no real authentication — it runs as a single, hardcoded demo user. Do **not** deploy it to a public server where others can access it. Health data you import is stored in a local SQLite file that is never committed to this repository.

A personal health dashboard that tracks your circadian rhythm and calculates a daily **CAD (Circadian Aligned Days) score**. Supports Apple Health CSV exports in Japanese and English, and can pull data from a Google Sheets spreadsheet.

---

## What is a CAD Score?

The CAD score (0–100) measures how well your daily habits align with your circadian rhythm. It is a weighted composite of four components:

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| Sleep | 40% | Duration (7–9 h optimal), bedtime window (9–11 PM optimal) |
| Meal timing | 30% | First meal (6–10 AM optimal), eating window (10–12 h optimal), last meal (before 7 PM optimal) |
| Activity | 20% | Total duration (30–90 min optimal), timing (morning/afternoon preferred) |
| Consistency | 10% | Day-to-day variance in bedtime and wake time over 7 days |

Score interpretation:

- **80–100** — Excellent circadian alignment
- **60–79** — Good, with room for improvement
- **40–59** — Fair, focus on consistency
- **0–39** — Needs significant changes

---

## Features

- **CAD Score dashboard** — Real-time score with breakdown and 7-day trend chart
- **Apple Health CSV import** — Full support for Japanese column names (`睡眠分析`, `ステップカウント`, `心拍数`) exported from the iOS Health app
- **Google Sheets sync** — Import health data from a publicly shared sheet; multi-tab sheets are supported via the `gid` parameter
- **Multilingual UI** — English and Japanese (日本語) via next-intl
- **Local SQLite database** — Zero infrastructure; Prisma manages the schema

---

## Tech Stack

- **Next.js 14** (App Router), React 18, TypeScript, Tailwind CSS
- **shadcn/ui** + Radix UI
- **Prisma ORM** with SQLite (`prisma/dev.db` — gitignored)
- **NextAuth.js** wired up but auth is incomplete; dashboard uses a fixed demo user
- **next-intl** for i18n

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/isaka1022/health-dashboard.git
cd health-dashboard
npm install
```

### Environment variables

Create a `.env.local` file (never commit this):

```bash
# Required — local SQLite path is already set in prisma/schema.prisma, so DATABASE_URL is optional
DATABASE_URL="file:./prisma/dev.db"

# NextAuth — required to start the server even if auth is unused
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-local-use"

# Optional — only needed if you want Google OAuth or Google Sheets API
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_SHEETS_API_KEY=""
```

### Database setup

```bash
npx prisma generate
npx prisma db push
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Importing Data

### Apple Health (Japanese CSV)

1. On your iPhone, open **Health** → your profile → **Export All Health Data**
2. The ZIP contains CSV files with Japanese column headers (`開始日時`, `終了日時`, etc.)
3. Go to the **Sources** page in the dashboard and upload the CSV file

### Google Sheets

1. Create a sheet with these columns:

   | Column | Format | Example |
   |--------|--------|---------|
   | Date | YYYY-MM-DD | 2024-01-15 |
   | Sleep Duration | hours (decimal) | 7.5 |
   | Bedtime | HH:MM | 22:30 |
   | Wake Time | HH:MM | 06:30 |
   | First Meal | HH:MM | 08:00 |
   | Last Meal | HH:MM | 19:30 |
   | Exercise Duration | minutes (integer) | 60 |
   | Exercise Type | text | Running |

2. Share the sheet as **Anyone with the link → Viewer**
3. Paste the URL (or URL with `gid=…` for a specific tab) in **Sources → Add Google Sheet**

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/          # GET — CAD scores and 7-day trends
│   │   ├── imports/apple-health/  # POST — parse and store Apple Health CSV
│   │   └── sources/sheet/      # POST/sync — Google Sheets import
│   └── [locale]/               # Localized pages (dashboard, sources, auth)
├── components/                 # UI components (cad-score-circle, score-breakdown, etc.)
├── lib/
│   ├── cad-calculator.ts       # CAD score algorithm
│   ├── apple-health-parser.ts  # Apple Health XML/CSV parser
│   ├── google-sheets.ts        # Sheets fetch and normalization
│   └── prisma.ts               # Prisma client singleton
└── types/
```

---

## How the CAD Score Works

The CAD score is a weighted composite of four sub-scores, each 0–100, combined as:

```
CAD = sleep × 0.4 + meal_timing × 0.3 + activity × 0.2 + consistency × 0.1
```

### Sleep sub-score (40% weight)

| Criterion | Points |
|-----------|--------|
| Duration 7–9 h | 40 |
| Duration 6–10 h | 30 |
| Duration 5–11 h | 20 |
| Other | 10 |
| Bedtime 9–11 PM | 30 |
| Bedtime 8 PM | 20 |
| Other | 10 |
| Sleep quality (0–10 scale, if available) | 0–30 |

### Meal timing sub-score (30% weight)

| Criterion | Points |
|-----------|--------|
| First meal 6–10 AM | 30 |
| First meal 5 AM–12 PM | 20 |
| Other | 10 |
| Eating window 10–12 h | 40 |
| Eating window 8–14 h | 30 |
| Eating window 6–16 h | 20 |
| Other | 10 |
| Last meal ≤ 7 PM | 30 |
| Last meal ≤ 8 PM | 20 |
| Other | 10 |

### Activity sub-score (20% weight)

| Criterion | Points |
|-----------|--------|
| Total duration 30–90 min | 50 |
| Total duration 15–120 min | 35 |
| Any activity recorded | 20 |
| Activity in morning or afternoon (6 AM–6 PM) | 50 |
| Activity only in evening/night | 25 |

### Consistency sub-score (10% weight)

Calculated from bedtime and wake-time variance over the previous 7 days.

| Variance (hours, SD) | Points (each of bedtime / wake time) |
|----------------------|--------------------------------------|
| ≤ 1 h | 50 |
| ≤ 2 h | 35 |
| ≤ 3 h | 20 |
| > 3 h | 10 |

Requires at least 3 prior days of data; defaults to 50 with insufficient history.

### Scientific basis

The scoring thresholds reflect current evidence on circadian alignment and cardiometabolic health:

- Martin ZT et al. (2026). "From light and activity to risk: circadian alignment as an emerging wearable biomarker." *Eur J Prev Cardiol*. [DOI: 10.1093/eurjpc/zwag026](https://doi.org/10.1093/eurjpc/zwag026)
- Baron KG et al. (2016). "Circadian timing and alignment in healthy adults: associations with BMI, social jetlag and sleep." *Int J Obes*. [DOI: 10.1038/ijo.2016.194](https://doi.org/10.1038/ijo.2016.194)

---

## Roadmap

### Now

- Remove NextAuth scaffolding and replace with a simple fixed demo-user session (eliminates `next-auth`, `@next-auth/prisma-adapter`, Account/Session/VerificationToken models)
- Persist steps and resting heart rate from Apple Health imports (parser already extracts them; the sync route discards them)
- Show a clear error in the UI when a ZIP archive is uploaded instead of a CSV

### Next

- Health Auto Export webhook receiver endpoint (eliminate manual CSV upload)
- Wire up the CAD daily breakdown hover (score-breakdown component is not connected to the API)
- Fix ImportLog foreign-key design (current schema causes constraint errors on insert)
- Correct Google Sheets steps-based activity duration (currently hardcoded to 60 min regardless of step count)

### Later

- Additional metrics: HRV, resting heart rate trend, body weight
- Academic interdaily stability (IS) and intradaily variability (IV) indices
- Home Assistant / MQTT integration for real-time data push

---

## Known Limitations / Security Notes

- **No real authentication.** The dashboard auto-creates and logs in as a fixed `test@example.com` demo user. Anyone who can reach the server can read and modify all data.
- **Apple Health XML import** is parsed but the upload UI is not fully wired; Google Sheets is the recommended import path.
- **NextAuth** is scaffolded (Google OAuth config exists) but the flow is not complete.
- SQLite `dev.db` is listed in `.gitignore` and must never be committed — it contains your personal health records.

---

## License

MIT — see [LICENSE](LICENSE).
