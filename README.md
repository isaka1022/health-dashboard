# Circadian AI Dashboard

A Next.js application that analyzes your health data to calculate a Circadian Aligned Days (CAD) score and provides insights for optimizing your circadian rhythm.

## Features

- **CAD Score Calculation**: Daily score based on sleep, meal timing, activity, and consistency
- **Google Sheets Integration**: Import health data from publicly viewable Google Sheets
- **Visual Dashboard**: Interactive charts and metrics visualization
- **Weekly Trends**: Track progress and identify patterns over time
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (configured for Supabase)
- **Styling**: TailwindCSS with shadcn/ui components

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

## Current Limitations

- Authentication is not yet implemented (uses mock user ID)
- Apple Health import is not yet functional
- Google OAuth integration is prepared but not active
- Database migrations need to be run manually

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