# Common Table

**Food resources for everyone, every day.**

External resource for the University of St. Thomas (St. Paul, MN) community when the campus food shelf is closed. Shows food shelves within a **15-mile radius** of campus in a weekly calendar view.

## Features

- **Weekly scroll** — Tap or click a day (Sun–Sat) to see which shelves are open.
- **All locations** — Every listed shelter is shown for the selected day; “Open today” badge and hours when open, “Closed today” when not.
- **Hours & meal times** — Operating hours and when food/meals are available.
- **Eligibility** — Requirements (area served, ID, etc.) where applicable.
- **Community photos** — “Add photo” on any shelter to upload an image (e.g. what’s available). Stored in Supabase; optional AI detection when the SMS service is connected.
- **SMS alerts** — Opt in with a phone number to get daily texts with the closest food shelves open that day (requires the Python SMS service and Twilio).
- **AI food detection** — Upload a photo of what’s at a location; the app uses Claude to detect food items and estimated quantity, then shows “Detected: [item] — [quantity]” on the photo (requires the Python service and `ANTHROPIC_API_KEY`).

## Launch checklist

1. **Supabase** — Create a project, run `supabase/migrations/001_initial_schema.sql`, create storage buckets (`avatars`, `shelter-photos`, `food-rescue-photos`), then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`.
2. **Optional: SMS + AI** — To enable SMS signup and AI food detection on photos, set `VITE_SMS_API_URL` in `frontend/.env` and run the `sms/` service (see [SMS alerts](#sms-alerts-optional) below).
3. **Optional: No Supabase** — You can run **food rescue** and **community chat** without Supabase by using the included backend. See [Run without Supabase](#run-without-supabase-optional-backend) below.

## Run without Supabase (optional backend)

To let users create food rescue posts and send chat messages **without any Supabase or sign-in**:

1. **Start the backend** (from repo root):
   ```bash
   cd backend
   npm install
   npm start
   ```
   The API runs at `http://localhost:3001` and uses a local SQLite DB (`data.db`).

2. **Point the frontend at it**: In `frontend/.env` set:
   ```env
   VITE_API_URL=http://localhost:3001
   ```
   Do **not** set `VITE_SUPABASE_URL` (or leave it empty) if you want food rescue and chat to use only the backend.

3. Restart the frontend (`npm run dev` in `frontend/`). Create post and Community chat will use the API: no auth, no Supabase. Visitors get a random persistent name (stored in the browser).

For production, deploy the backend (e.g. Railway, see below) and set `VITE_API_URL` to its URL. The backend allows CORS from any origin.

### Deploy backend on Railway (no Supabase)

You can run the app with **only the backend** — no Supabase, no sign-in. Food Rescue and Community Chat work with the Railway API; other features (per-shelter community/photos, profiles) show empty or a short message.

1. **Deploy the backend**
   - Go to [Railway](https://railway.app) and create a new project.
   - Connect your GitHub repo and set the **Root Directory** to `backend` (or deploy from the `backend/` folder).
   - Railway will detect Node and run `npm start`. The server uses `process.env.PORT` (Railway sets this).
   - After deploy, copy the public URL (e.g. `https://your-app.up.railway.app`).

2. **Backend env (Railway)** — In your Railway project, add **Variables**:
   - **`TWILIO_ACCOUNT_SID`** — from [Twilio Console](https://console.twilio.com)
   - **`TWILIO_AUTH_TOKEN`** — from Twilio Console
   - **`TWILIO_PHONE_NUMBER`** — your Twilio phone number (e.g. `+15551234567`) with SMS capability  
   With these set, “Get SMS alerts” on the frontend will work (subscribe + daily digest). Optional: **`CRON_SECRET`** to protect `GET /api/send-daily?key=...` for cron-triggered daily texts.

3. **Point the frontend at the backend**
   - In **Vercel** (or your frontend host), add one environment variable:  
     **`VITE_API_URL`** = your Railway backend URL (e.g. `https://your-app.up.railway.app`). If you omit `https://`, it is added automatically.
   - Do **not** set `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`. With only `VITE_API_URL` set, the app uses the backend for Food Rescue, Chat, and **SMS alerts** (no separate SMS service needed).

4. Redeploy the frontend so the new env is baked in. Create post, Community chat, and SMS signup will work without any sign-in.

**Note:** The backend uses SQLite and local file uploads. On Railway the filesystem is ephemeral, so data and uploads are lost on redeploy unless you add a persistent volume. For production you may want to switch to a hosted DB (e.g. PostgreSQL) and object storage later.

## Run locally

The frontend lives in `frontend/`. From the repo root:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## Build for production

```bash
cd frontend
npm run build
```

Output is in `frontend/dist/`. Serve with any static host.

## Deploy on Vercel

1. Push your repo to GitHub (or connect another Git provider).
2. In [Vercel](https://vercel.com), **Add New Project** and import this repo.
3. Set **Root Directory** to `frontend` (Edit → Root Directory → `frontend`).
4. Add **Environment Variables** (Settings → Environment Variables) so the build can embed them:
   - **To use Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - **To use only the backend (no Supabase):** set `VITE_API_URL` to your backend URL (e.g. `https://your-backend.up.railway.app`) and leave Supabase vars unset.
   - Optional: `VITE_SMS_API_URL` — full URL of your deployed SMS service if you use SMS/AI.
5. Deploy. The app will be built with `npm run build` and served with SPA rewrites (see `frontend/vercel.json`).

**If you see 405 or "Unexpected token '<'" when creating a post or using chat:** the frontend is calling the wrong host. Add `VITE_API_URL` in Vercel (e.g. `https://buildfest-production-c655.up.railway.app`), then trigger a new deploy so the build embeds the correct API URL.

The optional SMS/AI Python service in `sms/` must be hosted separately (e.g. Railway, Render) and its URL set as `VITE_SMS_API_URL` for production.

## Data

Seed data includes real and representative food shelves near St. Thomas (Keystone, Hallie Q. Brown, Neighbors Inc., Open Cupboard, etc.). For a real deployment, replace or extend `frontend/src/data/shelters.ts` with data from [Hunger Solutions](https://www.hungersolutions.org/find-help/) or the Minnesota Food HelpLine (1-888-711-1151).

## SMS alerts (optional)

SMS is **built into the Node backend** (Railway). No separate Python service needed.

1. **Backend (Railway or local)** — Set in your backend env:
   - `TWILIO_ACCOUNT_SID` — from [Twilio Console](https://console.twilio.com)
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` — e.g. `+15551234567` (must have SMS capability)
2. **Frontend** — Uses `VITE_API_URL` for SMS when set (same as Food Rescue/Chat). In dev with no env, it defaults to `http://localhost:3001`.
3. **Daily digest** — Call `GET /api/send-daily` (or `POST`) once per day (e.g. cron). Optional: set `CRON_SECRET` and call with `?key=your_secret`.

The standalone Python service in `sms/` is still available for **AI food detection** in photos (Claude) and the chat assistant; set `VITE_SMS_API_URL` to that service if you use it. For SMS-only, the backend is enough.

## Community layer (Supabase)

The app is **open access with no login page**. Visitors get an anonymous session automatically so they can browse, chat, post, and use food rescue without creating an account.

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Enable Anonymous sign-ins**: In Dashboard → Authentication → Providers, turn on **Anonymous sign-ins**.
3. **Run the schema**: In the Supabase SQL Editor, run the contents of `supabase/migrations/001_initial_schema.sql` (creates tables, RLS, Realtime for `chat_messages`, trigger for new user profiles, seed topic chat rooms).
4. **Create storage buckets** in Dashboard → Storage: `avatars`, `shelter-photos`, `food-rescue-photos` (all public). Add policies so authenticated users can upload; see migration comments.
5. **Env**: In `frontend/`, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

After that, the frontend works with no sign-up or sign-in: shelter pages, photos, community posts, chat, and food rescue are all available to everyone.

### 422 when sending chat or creating a post ("Cannot log you in")

1. **Confirm the project**: In the dashboard, ensure you're in the project that matches `VITE_SUPABASE_URL` (e.g. `xuctylxhktmjovwfvzao.supabase.co`).
2. **Enable Anonymous sign-ins**: [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers** → turn on **Anonymous sign-ins**.
3. **Check "Disable new sign ups"**: In **Authentication** → **Settings** (or **Providers**), if there is an option like "Disable new sign ups" or "Enable sign ups", ensure new sign-ups are allowed (anonymous sign-in uses the signup endpoint).
4. **Retry**: Hard refresh or try in an incognito window; wait a minute after changing settings.

### "new row violates row-level security policy" when posting or sending chat

The database may need explicit policies for the authenticated role (including anonymous users). In the Supabase SQL Editor, run the contents of `supabase/migrations/003_rls_allow_authenticated_inserts.sql`. Then try again.

### Supabase timing out or login stuck?

If the app hangs on "Loading…" or "Signing in…" and then shows a timeout, Supabase is not responding in time. Common causes:

1. **Project paused (free tier)**  
   Free projects pause after about 7 days of inactivity. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project. If you see **Project is paused**, click **Restore project**. Wait a few minutes and try again.

2. **Wrong URL or anon key**  
   - **URL**: Must be exactly `https://YOUR_PROJECT_REF.supabase.co` (no trailing slash). Get it from Dashboard → Project Settings → API → Project URL.  
   - **Anon key**: Use the **anon** / **public** key from the same API page (long JWT starting with `eyJ...`). Do not use the `service_role` key in the frontend.

3. **Network / firewall**  
   If you’re on a strict network or VPN, requests to `*.supabase.co` may be blocked or delayed. Try another network or disable VPN to test.

4. **Browser storage**  
   In some browsers or private mode, auth storage can lock and cause slow or failed session checks. Try a normal window or another browser.

The app now runs a short connectivity check on load. If Supabase is unreachable, you’ll see a message like "Supabase is not responding" or "Cannot reach Supabase" instead of an endless spinner.

### Fixing "email rate limit exceeded" / sign-up blocked

Supabase Auth limits how many sign-up emails can be sent per hour (default is low). To fix your **hosted** project:

1. **Create a Personal Access Token**: [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens). Create a token (it needs access to update project config).
2. **Run the auth fix script** from the repo root (uses `frontend/.env` for project ref):
   ```bash
   SUPABASE_ACCESS_TOKEN="your-token-here" ./scripts/update-supabase-auth.sh
   ```
   This sets **mailer_autoconfirm** (so new users can sign in without confirming email) and **rate_limit_email_sent** to 30 per hour.

Alternatively, in the [Supabase Dashboard](https://supabase.com/dashboard): open your project → **Authentication** → **Rate Limits** and increase "Emails sent per hour" if the option is available; and under **Providers → Email** turn off "Confirm email" so sign-up doesn’t require a confirmation email.

### Supabase CLI (optional)

The repo includes Supabase CLI config (`supabase/config.toml`). Useful commands (from repo root):

- **Local Supabase** (Postgres + Auth + Studio): `npx supabase start`
- **Stop local**: `npx supabase stop`
- **Link to your hosted project**: `npx supabase link --project-ref YOUR_PROJECT_REF` (ref is the subdomain of your project URL, e.g. `xuctylxhktmjovwfvzao`)
- **Push migrations**: `npx supabase db push` (after linking)

Local `config.toml` already has a higher `auth.rate_limit.email_sent` (30) for development.

## Tech

- **Frontend** (`frontend/`): React 18 + TypeScript, Vite 5, React Router, Leaflet/react-leaflet, Supabase (auth, DB, storage, Realtime). Purple and white theme; navbar (Home, Food Rescue, Community, Chat, notifications, profile); calendar + map on Home; shelter pages with Info/Photos/Community/Chat tabs.
- **Community data**: Supabase (user_profiles, shelter_photos, community_posts, comments, chat_rooms, chat_messages, food_rescue_posts, notifications, reports). Shelter list remains in `frontend/src/data/shelters.ts`.
- **SMS/AI**: Optional Python service in `sms/` (Twilio + Claude) unchanged.
