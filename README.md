# Spotlite Presenter

Premium, password-protected content delivery pages for creators — built by Spotlite Africa.

## What this is

Creators sign up, upload a client's photos/videos, set a password, and publish
(₦5,000 per project via Paystack) to get a shareable link like
`yourproduct.com/soundhous`. Their client opens the link, optionally enters
their email, enters the password, and views a cinematic presentation of the
content — instead of a Dropbox folder.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up environment variables**
   Copy `.env.example` to `.env` and fill in real values:
   ```
   cp .env.example .env
   ```

3. **Database (Postgres)**
   - Easiest: create a free project at supabase.com, grab the connection
     string from Project Settings → Database → Connection string (use the
     "Transaction" pooler string for `DATABASE_URL`).
   - Then run:
     ```
     npx prisma migrate dev --name init
     ```
     This creates all tables (Creator, Project, Media, ViewerEmail).

4. **Cloudflare R2 (file storage)**
   - Create a bucket at dash.cloudflare.com → R2.
   - Go to bucket Settings → enable "Public access" (via R2.dev subdomain or
     a custom domain) and copy that URL into `R2_PUBLIC_URL`.
   - Create an R2 API token (Account → R2 → Manage API Tokens) with
     Object Read & Write permissions on this bucket — that gives you
     `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
   - `R2_ACCOUNT_ID` is shown on the main Cloudflare dashboard sidebar.

5. **Paystack**
   - Get your secret key from dashboard.paystack.com → Settings → API Keys.
   - Once deployed, set your webhook URL in Paystack:
     Settings → API Keys & Webhooks → Webhook URL:
     `https://yourproduct.com/api/payments/webhook`

6. **Run locally**
   ```
   npm run dev
   ```

## How it works

- `/signup`, `/login` — creator accounts (self-contained auth: bcrypt + JWT
  cookie, no external auth provider needed)
- `/dashboard` — list of a creator's projects
- `/dashboard/new` — create a project: uploads go directly from the browser
  to R2 via short-lived presigned URLs (files never pass through your server)
- `/dashboard/[projectId]` — project detail + the "Publish — ₦5,000" button,
  which starts a Paystack checkout
- `/[slug]` — the actual public delivery page the client opens. Optional
  email gate → password gate → the presentation itself (video grid, photo
  grid, click-to-expand modals with audio)

## Notes on what's intentionally simple (v1 scope)

- No password reset flow yet for creator accounts.
- No project editing UI for swapping/reordering media after creation
  (only creation-time upload is wired up).
- Branding fields (`logoUrl`, `primaryColor`, `bgColor`) exist in the schema
  and are read by the delivery page, but there's no dashboard UI to set them
  yet — set them directly via a PATCH to `/api/projects/[id]` for now.
- Video files are served at their original quality — for very large uploads
  you may want to add a transcoding step (e.g. Cloudflare Stream or a
  background ffmpeg job) later.
