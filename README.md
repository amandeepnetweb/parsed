# Parsed

AI-powered document chat tool. Upload PDF, DOCX, TXT, or Markdown files — ask anything about them.

Parsed extracts text, embeds it into Pinecone, and uses Google Gemini to answer questions with source citations.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** Better Auth (email/password + Google OAuth)
- **Database:** PostgreSQL via Neon + Drizzle ORM
- **File Storage:** Vercel Blob
- **Vector DB:** Pinecone
- **Embeddings + LLM:** Google Gemini (via `@ai-sdk/google`)
- **Real-time:** Pusher
- **Task Queue:** Inngest
- **Email:** Resend

---

## Deploy to Vercel

### Prerequisites

Set up the following external services before deploying:

| Service | Purpose | URL |
|---|---|---|
| Neon | PostgreSQL database | https://neon.tech |
| Pinecone | Vector database | https://pinecone.io |
| Google AI Studio | Gemini LLM + embeddings | https://aistudio.google.com |
| Pusher | Real-time file processing updates | https://pusher.com |
| Inngest | Background job queue | https://inngest.com |
| Resend | Password reset emails | https://resend.com |
| Google Cloud Console | OAuth2 login (optional) | https://console.cloud.google.com |

---

### Step 1 — Set up Neon (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a new project → copy the **pooled connection string**.
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Save as `DATABASE_URL`.

---

### Step 2 — Set up Pinecone (Vector DB)

1. Go to [pinecone.io](https://pinecone.io) → create a free account.
2. Create a new **index** with these exact settings:
   - **Name:** `parsed`
   - **Dimensions:** `768`
   - **Metric:** `cosine`
3. Copy your **API key** from the dashboard.
4. Save as:
   - `PINECONE_API_KEY` = your API key
   - `PINECONE_INDEX_NAME` = `parsed`

---

### Step 3 — Get a Google Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com).
2. Click **Get API Key** → create a new key.
3. Save as `GOOGLE_GENERATIVE_AI_API_KEY`.

This single key powers both:
- LLM responses via `gemini-2.0-flash`
- Text embeddings via `gemini-embedding-001` (768 dims)

---

### Step 4 — Set up Pusher (Real-time Updates)

1. Go to [pusher.com](https://pusher.com) → create a free account.
2. Create a new **Channels** app → pick a cluster closest to your users.
3. From the app's **Keys** tab, copy:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER` (e.g. `ap2`, `us2`, `eu`)
4. `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are the same as above.

---

### Step 5 — Set up Inngest (Background Jobs)

1. Go to [inngest.com](https://inngest.com) → create a free account.
2. Create a new app → copy:
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`

---

### Step 6 — Set up Resend (Email)

1. Go to [resend.com](https://resend.com) → create a free account.
2. Create an API key → save as `RESEND_API_KEY`.
3. Verify a sending domain (or use Resend's sandbox for testing).

---

### Step 7 — Set up Google OAuth (Optional)

Only needed if you want **Sign in with Google**.

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a project → go to **APIs & Services → Credentials**.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add your production URL to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
5. Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

### Step 8 — Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Framework preset: **Next.js** (auto-detected).
4. Add all environment variables from the reference list below.
5. Click **Deploy**.

Or via CLI:

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### Step 9 — Add Vercel Blob Storage

1. In your Vercel project dashboard → **Storage** tab.
2. Create a **Blob** store → connect it to your project.
3. Vercel auto-injects `BLOB_READ_WRITE_TOKEN` — no manual configuration needed.

---

### Step 10 — Run Database Migrations

Run once after first deploy (and again after any schema changes):

```bash
# Clone locally if not already done
git clone <your-repo-url>
cd parsed
npm install

# Copy env and fill in values
cp .env.example .env

# Run migrations against your Neon database
npm run db:migrate
```

---

### Step 11 — Configure Inngest Webhook

1. In the Inngest dashboard → **Apps** → set the **Event URL** to:
   ```
   https://your-app.vercel.app/api/inngest
   ```
2. This lets Inngest trigger the file processing pipeline after uploads.

---

### Step 12 — Update Auth URLs

In your Vercel project environment variables, make sure these point to your production domain:

```
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

If using Google OAuth, update the redirect URI in Google Cloud Console to match.

---

## Environment Variables Reference

```bash
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# ── Auth ──────────────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=          # generate: openssl rand -base64 32
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── File Storage (auto-injected by Vercel Blob) ───────────────────────────────
BLOB_READ_WRITE_TOKEN=

# ── AI — Google Gemini ────────────────────────────────────────────────────────
LLM_PROVIDER=google
EMBEDDING_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=    # from aistudio.google.com

# Optional model overrides (defaults shown)
# LLM_MODEL=gemini-2.0-flash
# EMBEDDING_MODEL=gemini-embedding-001

# ── Vector DB (Pinecone) ──────────────────────────────────────────────────────
PINECONE_API_KEY=
PINECONE_INDEX_NAME=parsed

# ── Real-time (Pusher) ────────────────────────────────────────────────────────
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# ── Background Jobs (Inngest) ─────────────────────────────────────────────────
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY=
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy and fill env vars
cp .env.example .env

# Apply migrations
npm run db:migrate

# Start dev server + Inngest local runner
npm run dev:all
```

- App: `http://localhost:3000`
- Inngest dev UI: `http://localhost:8288`

---

## Switching LLM Provider

Change via env vars — no code changes needed.

| Provider | `LLM_PROVIDER` | `EMBEDDING_PROVIDER` | Required Key |
|---|---|---|---|
| Google Gemini | `google` | `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenAI | `openai` | `openai` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `openai` | `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` |
| Ollama (local) | `ollama` | `ollama` | `OLLAMA_BASE_URL` |

> Pinecone index dimensions must match your embedding model. `gemini-embedding-001` → 768 dims. `text-embedding-3-small` (OpenAI) → 1536 dims.

---

## Scripts

```bash
npm run dev           # Start dev server
npm run dev:all       # Dev server + Inngest runner
npm run build         # Production build (includes widget)
npm run lint          # ESLint
npm run ts:check      # TypeScript check
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations
npm run db:studio     # Drizzle Studio GUI
```
