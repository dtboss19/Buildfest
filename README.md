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
   - `VITE_SUPABASE_URL` — your Supabase project URL (e.g. `https://xxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key.
   - Optional: `VITE_SMS_API_URL` — full URL of your deployed SMS service (e.g. `https://your-sms.railway.app`) if you use SMS/AI.
5. Deploy. The app will be built with `npm run build` and served with SPA rewrites (see `frontend/vercel.json`).

The optional SMS/AI Python service in `sms/` must be hosted separately (e.g. Railway, Render) and its URL set as `VITE_SMS_API_URL` for production.

## Data

Seed data includes real and representative food shelves near St. Thomas (Keystone, Hallie Q. Brown, Neighbors Inc., Open Cupboard, etc.). For a real deployment, replace or extend `frontend/src/data/shelters.ts` with data from [Hunger Solutions](https://www.hungersolutions.org/find-help/) or the Minnesota Food HelpLine (1-888-711-1151).

## SMS alerts (optional)

To enable “Get SMS alerts” on the frontend:

1. In `sms/`: copy `.env.example` to `.env` and set your Twilio credentials (Account SID, Auth Token, phone number).
2. Run the Python service: `cd sms && pip install -r requirements.txt && python app.py` (listens on port 5000).
3. In dev the frontend calls `http://localhost:5000` by default. For production set `VITE_SMS_API_URL` to your deployed SMS service URL.
4. Call `GET /api/send-daily` once per day (e.g. via cron) to send today’s digest to all subscribers.

For **AI food detection** in photos, set `ANTHROPIC_API_KEY` in `sms/.env` (Claude API credits). The frontend sends uploaded images to `POST /api/analyze-food-image` on the same service.

See `sms/README.md` for API details and Twilio setup.

## Community layer (Supabase)

The app is **open access with no login page**. Visitors get an anonymous session automatically so they can browse, chat, post, and use food rescue without creating an account.

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Enable Anonymous sign-ins**: In Dashboard → Authentication → Providers, turn on **Anonymous sign-ins**.
3. **Run the schema**: In the Supabase SQL Editor, run the contents of `supabase/migrations/001_initial_schema.sql` (creates tables, RLS, Realtime for `chat_messages`, trigger for new user profiles, seed topic chat rooms).
4. **Create storage buckets** in Dashboard → Storage: `avatars`, `shelter-photos`, `food-rescue-photos` (all public). Add policies so authenticated users can upload; see migration comments.
5. **Env**: In `frontend/`, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

After that, the frontend works with no sign-up or sign-in: shelter pages, photos, community posts, chat, and food rescue are all available to everyone.

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
