# Circadian AI Health Dashboard

AI-powered health dashboard that analyzes your circadian rhythm and provides personalized insights for optimal performance. Supports both English and Japanese interfaces with full Apple Health integration.

## Features

- **CAD Score Calculation**: Daily Circadian Aligned Days score with detailed breakdown (Sleep 40%, Meals 30%, Activity 20%, Consistency 10%)
- **Japanese Apple Health Support**: Full integration with Japanese Apple Health CSV exports (睡眠分析, ステップカウント, 心拍数)
- **Google Sheets Integration**: Import health data from Google Sheets with GID parameter support for multi-tab sheets
- **Apple Health Import**: Direct XML file import from Apple Health exports (planned)
- **Multilingual Dashboard**: Available in English and Japanese (日本語) with next-intl
- **Real-time Sync**: Automatic data processing and CAD score calculation
- **Visual Analytics**: Interactive charts showing trends and weekly progress
- **Responsive Design**: Mobile-optimized interface with shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: NextAuth.js (ready for implementation)
- **Internationalization**: next-intl with English/Japanese support
- **Data Processing**: Custom Apple Health parser with Japanese column mapping

## Getting Started

### Prerequisites

- Node.js 20 or later
- PostgreSQL database (or Supabase account)
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and update with your database credentials:
   ```bash
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/circadian_dashboard?schema=public"
   
   # NextAuth (for future OAuth implementation)
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # Google OAuth (for future implementation)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Google Sheets API (for future direct API access)
   GOOGLE_SHEETS_API_KEY="your-sheets-api-key"
   ```

3. **Set up the database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Setting Up Data Sources

1. Navigate to the "Data Sources" page
2. Create a Google Sheet with your health data using these columns:
   - `Date` (YYYY-MM-DD format)
   - `Sleep Duration` (hours, e.g., 7.5)
   - `Bedtime` (HH:MM format, e.g., 22:30)
   - `Wake Time` (HH:MM format, e.g., 06:30)
   - `First Meal` (HH:MM format, e.g., 08:00)
   - `Last Meal` (HH:MM format, e.g., 19:30)
   - `Exercise Duration` (hours, e.g., 1.0)
   - `Exercise Type` (text, e.g., "Running")

3. Make the sheet publicly viewable (Share > Anyone with the link can view)
4. Copy the sheet URL and add it as a data source
5. The system will automatically sync and calculate your CAD scores

### Understanding Your CAD Score

Your CAD (Circadian Aligned Days) score is calculated from four components:

- **Sleep Score (40%)**: Based on duration (7-9 hours optimal), timing (bedtime 9-11 PM optimal), and quality
- **Meal Timing Score (30%)**: Based on first meal timing (6-10 AM optimal), eating window (10-12 hours optimal), and last meal timing (before 7 PM optimal)
- **Activity Score (20%)**: Based on exercise duration (30-90 minutes optimal) and timing (morning/afternoon preferred)
- **Consistency Score (10%)**: Based on day-to-day regularity in sleep and meal timing

### Score Interpretation

- **80-100**: Excellent circadian alignment
- **60-79**: Good alignment with room for improvement
- **40-59**: Fair alignment, focus on consistency
- **0-39**: Poor alignment, needs significant changes

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── sources/           # Data sources page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── cad-score-circle.tsx
│   ├── score-breakdown.tsx
│   ├── health-metrics.tsx
│   └── weekly-summary.tsx
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Database client
│   ├── cad-calculator.ts # CAD score calculation logic
│   ├── google-sheets.ts  # Google Sheets import logic
│   └── utils.ts          # General utilities
└── types/                 # TypeScript type definitions
```

## API Endpoints

- `POST /api/sources/sheet` - Add a new Google Sheets data source
- `POST /api/sources/sheet/[id]/sync` - Sync data from a Google Sheets source
- `GET /api/dashboard` - Get dashboard data with CAD scores and metrics

## Development

### Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- `User` - User accounts (ready for authentication)
- `GoogleSheetSource` - Connected Google Sheets data sources
- `Meal`, `SleepSession`, `Activity` - Health data records
- `CircadianMetric` - Calculated CAD scores and components
- `ImportLog` - Track data import operations

### Adding New Features

1. **New Data Sources**: Extend the import system in `src/lib/`
2. **Additional Metrics**: Update the CAD calculation logic in `src/lib/cad-calculator.ts`
3. **UI Components**: Add new components in `src/components/`
4. **API Endpoints**: Create new routes in `src/app/api/`

## Recent Updates

- ✅ **Japanese Apple Health Support**: Full integration with Japanese column names (睡眠分析, ステップカウント, 心拍数)
- ✅ **Google Sheets GID Support**: Handle multi-tab sheets with gid parameter extraction
- ✅ **Data Sync Working**: Successfully tested with 51 health records import (23 sleep + 28 activities)
- ✅ **CAD Score Display**: Real-time dashboard showing calculated circadian alignment scores
- ✅ **Database Integration**: SQLite working with Prisma ORM and health data storage

## Current Status

- Google Sheets integration: **Fully functional**
- Japanese Apple Health data: **Fully supported**
- Dashboard and scoring: **Working with real data**
- Authentication: Uses demo user (production auth ready to implement)
- Apple Health XML import: Planned for future release

## Future Enhancements

- [ ] Complete NextAuth integration with Google OAuth
- [ ] Implement Apple Health XML parsing
- [ ] Add data visualization with Recharts
- [ ] Weekly experiment tracking
- [ ] Email/browser notifications
- [ ] Advanced AI recommendations
- [ ] Mobile app with HealthKit integration

## License

This project is for educational and personal use. Please ensure compliance with health data regulations if using with real personal health information.