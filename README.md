# 🔥 Station Scheduler — Fire Dept Vacation & Bunker Gear Tracker

A full-stack web app for fire departments to manage firefighter vacations
and schedule bunker gear cleanings during their time away.

## Features

- **Calendar & List Views** — Visual monthly calendar + sortable list view
- **Vacation Management** — Add/delete vacations, auto-schedule gear cleanings
- **Gear Cleaning Tracking** — Schedule with vendor selection, status tracking
- **Crew Roster** — Add members with rank, shift, and email
- **Email Notifications** — Real emails via Resend when vacations/cleanings are added
- **Data Persistence** — All data stored in Supabase (PostgreSQL)
- **Export** — Download as CSV, printable HTML report, or JSON

## Tech Stack

| Layer     | Service        | Cost       |
|-----------|---------------|------------|
| Frontend  | Static HTML/JS | Free       |
| Hosting   | Netlify        | Free tier  |
| Database  | Supabase       | Free tier  |
| Email     | Resend         | Free tier (100 emails/day) |
| Backend   | Netlify Functions (serverless) | Free tier |

---

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project — pick any name and a strong database password
3. Once created, go to **Settings → API** and copy:
   - `Project URL` (looks like `https://xxxxx.supabase.co`)
   - `anon public` key (a long string starting with `eyJ...`)
4. Go to **SQL Editor** and run the contents of `supabase-schema.sql` (included in this project)

### 2. Create a Resend Account (for email)

1. Go to [resend.com](https://resend.com) and sign up
2. Go to **API Keys** and create a new key — copy it
3. (Optional) Add and verify your domain under **Domains** for custom from-addresses
   - Without a verified domain, emails send from `onboarding@resend.dev`

### 3. Deploy to Netlify

**Option A: Deploy via Git (recommended)**

1. Push this project folder to a GitHub/GitLab repo
2. Go to [netlify.com](https://netlify.com), sign in, click "Add new site → Import from Git"
3. Select your repo — Netlify auto-detects the config
4. Before deploying, go to **Site settings → Environment variables** and add:

   ```
   SUPABASE_URL       = https://xxxxx.supabase.co
   SUPABASE_ANON_KEY  = eyJhbGciOi...
   RESEND_API_KEY     = re_xxxxxxxxxx
   NOTIFY_FROM_EMAIL  = onboarding@resend.dev
   ```

5. Trigger a deploy — your site is live!

**Option B: Deploy via CLI**

```bash
npm install -g netlify-cli
netlify login
netlify init        # link to a new site
netlify env:set SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOi..."
netlify env:set RESEND_API_KEY "re_xxxxxxxxxx"
netlify env:set NOTIFY_FROM_EMAIL "onboarding@resend.dev"
netlify deploy --prod
```

### 4. Test It

1. Visit your Netlify URL
2. Add a crew member, then add a vacation — you should see:
   - Data persists on refresh (stored in Supabase)
   - An email sent to the member's address (via Resend)
   - Gear cleaning auto-scheduled

---

## Project Structure

```
station-scheduler/
├── index.html              # The full app (frontend)
├── netlify.toml             # Netlify config
├── supabase-schema.sql      # Database table definitions
├── netlify/
│   └── functions/
│       ├── api-members.mjs       # CRUD for crew members
│       ├── api-vacations.mjs     # CRUD for vacations
│       ├── api-gear.mjs          # CRUD for gear cleanings
│       └── api-send-email.mjs    # Email notifications via Resend
└── README.md
```

## Local Development

To test locally with Netlify Dev:

```bash
npm install -g netlify-cli
netlify dev
```

This runs the site at `http://localhost:8888` with serverless functions working locally.

---

## Notes

- **Free tier limits**: Supabase free tier gives 500MB database + 50K monthly requests.
  Resend free tier gives 100 emails/day. More than enough for a fire station.
- **Security**: The Supabase anon key is safe to expose client-side — row-level security
  policies on the database control access. For production, consider adding Supabase Auth.
- **Backups**: Supabase automatically backs up your database daily on paid plans.
  On free tier, use the JSON export feature as a manual backup.
