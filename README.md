# Daily Habit Tracker

A modern daily habit tracker built with **Next.js** and **Supabase**. Track habits on a monthly calendar, build streaks, and measure progress with a full analytics dashboard — with multi-user support out of the box.

[![Live Demo](https://img.shields.io/badge/live_demo-visit-brightgreen)](https://your-demo-url.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_&_Auth-3fcf8e)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com)

## Features

- **Email & password authentication** — sign up, log in, and log out, with protected routes that redirect unauthenticated visitors to the login page.
- **Multi-user by design** — each user's habits and completions are isolated at the database level using Postgres Row Level Security (RLS).
- **Calendar grid** — month view with one-click completion toggles for every habit.
- **Drag-and-drop ordering** — rearrange habits into the order that works for you.
- **Analytics dashboard** — completion rates, per-habit charts, current and best streaks, and a GitHub-style yearly heatmap.
- **Dark & light mode** — switch themes from the header.

## Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Framework        | Next.js 16 (App Router) · React 19           |
| Language         | TypeScript                                   |
| Database & Auth  | Supabase (Postgres + Auth + RLS)             |
| Client state     | Zustand                                      |
| Styling          | Tailwind CSS v4                              |
| UI components    | shadcn/ui (Radix primitives)                 |
| Charts           | Recharts                                     |
| Drag & drop      | dnd-kit                                      |
| Dates            | date-fns                                     |

## Getting Started

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the migration in [`supabase/migrations/20250820090000_init_schema.sql`](supabase/migrations/20250820090000_init_schema.sql). This creates the tables and RLS policies.
3. Under **Authentication → Providers**, enable **Email/Password**.
4. From **Project Settings → API**, copy your project URL, anon key, and service role key.

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable                     | Description                          |
| ---------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key              |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server-side service role key         |

### 3. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Create an account via **Sign up**, add your first habit, and start tracking.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login and signup pages
│   ├── api/auth/        # Signup, login, logout, session endpoints
│   ├── analytics/       # Analytics dashboard
│   ├── actions.ts       # Server actions for habits & completions
│   └── page.tsx         # Habit calendar (home)
├── components/          # Calendar grid, habit form, analytics, header, UI kit
└── lib/                 # Supabase clients, Zustand store, date helpers, types
```

## Available Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the development server       |
| `npm run build`   | Create a production build          |
| `npm start`       | Serve the production build         |
| `npm run lint`    | Run ESLint                         |
