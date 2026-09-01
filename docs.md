# Daily Habit Tracker — Docs

## Purpose

Track daily habits on a calendar, build streaks, and visualize progress through analytics. Multi-user support with secure data isolation.

## Features

### Auth & Multi-user
- Email/password signup & login via Supabase Auth
- Row Level Security — each user sees only their own data

### Habit Calendar
- Monthly grid view — habits as rows, days as columns
- Add/edit/delete habits with name, emoji, and category (Health, Mind, Work, Fitness, Other)
- One-click toggle to mark habits done per day
- Drag-and-drop reordering of habit rows
- Month navigation with "Today" button
    
### Analytics Dashboard
- Summary cards — completion %, level badge, active habits, best streak
- Per-habit completion bar chart
- Daily score line chart
- Streaks panel (current & best per habit)
- Yearly heatmap (GitHub-style)

### UI
- Dark & light mode toggle
- Optimistic updates (instant UI feedback, rollback on error)

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript |
| Database & Auth | Supabase (Postgres + RLS) |
| State | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Drag & Drop | dnd-kit |

## Project Structure

```
src/
├── app/             # Pages, API routes, server actions
├── components/      # UI components (calendar, analytics, forms)
├── lib/             # Supabase client, Zustand store, utils
└── proxy.ts         # Route protection middleware
supabase/
└── migrations/      # Database schema
```

## How It Works

1. User signs up/logs in → Supabase Auth handles sessions
2. Habits stored in `habits` table, completions in `completions` table
3. All mutations go through Server Actions → Supabase → revalidate cache
4. Zustand store holds client state with optimistic updates
5. Analytics computed from completion data using date-fns
