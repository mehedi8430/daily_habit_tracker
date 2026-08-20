# Daily Habit Tracker

A Next.js (App Router) daily habit tracker with Supabase multi-user support.

## Getting Started

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In your Supabase project, go to **SQL Editor** and run the migration SQL from `supabase/migrations/20250820090000_init_schema.sql`.
3. Enable **Email/Password** authentication in **Authentication > Providers**.
4. Copy your project URL, anon key, and service role key from **Project Settings > API**.

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. You will be redirected to `/login`.

### 5. Create an Account

Click **Sign up** to create a new account with email and password. After signing up, you will be redirected to the app where you can add habits and start tracking.

## Features

- **Multi-user**: Each user has their own habits and completions, isolated via Row Level Security (RLS).
- **Email/Password Auth**: Simple sign up, log in, and log out.
- **Calendar Grid**: View and toggle daily completions, drag to reorder habits.
- **Analytics**: Completion rates, per-habit charts, streaks, and a yearly heatmap.
- **Dark/Light Mode**: Toggle between themes.

## Tech Stack

- Next.js 16 (App Router)
- Supabase (Postgres + Auth)
- Zustand (client state)
- Tailwind CSS v4
- shadcn/ui
- Recharts
