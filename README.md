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
   | Exercise Duration | hours (decimal) | 1.0 |
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

## Known Limitations / Security Notes

- **No real authentication.** The dashboard auto-creates and logs in as a fixed `test@example.com` demo user. Anyone who can reach the server can read and modify all data.
- **Apple Health XML import** is parsed but the upload UI is not fully wired; Google Sheets is the recommended import path.
- **NextAuth** is scaffolded (Google OAuth config exists) but the flow is not complete.
- SQLite `dev.db` is listed in `.gitignore` and must never be committed — it contains your personal health records.

---

## License

MIT — see [LICENSE](LICENSE).
