# Common Table

**Food resources for everyone, every day.**

External resource for the University of St. Thomas (St. Paul, MN) community when the campus food shelf is closed. Shows food shelves within a **15-mile radius** of campus in a weekly calendar view.

## Features

- **Weekly scroll** — Tap or click a day (Sun–Sat) to see which shelves are open.
- **All locations** — Every listed shelter is shown for the selected day; “Open today” badge and hours when open, “Closed today” when not.
- **Hours & meal times** — Operating hours and when food/meals are available.
- **Eligibility** — Requirements (area served, ID, etc.) where applicable.
- **Community photos** — “Add photo” on any shelter to upload an image (e.g. what’s available). Stored in the browser only for the hackathon demo.
- **SMS alerts** — Opt in with a phone number to get daily texts with the closest food shelves open that day (requires the Python SMS service and Twilio).
- **AI food detection** — Upload a photo of what’s at a location; the app uses Claude to detect food items and estimated quantity, then shows “Detected: [item] — [quantity]” on the photo (requires the Python service and `ANTHROPIC_API_KEY`).

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

The app includes a full social community layer: auth, profiles, shelter photos, community posts, chat, food rescue, and notifications.

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema**: In the Supabase SQL Editor, run the contents of `supabase/migrations/001_initial_schema.sql` (creates tables, RLS, Realtime for `chat_messages`, trigger for new user profiles, seed topic chat rooms).
3. **Create storage buckets** in Dashboard → Storage: `avatars`, `shelter-photos`, `food-rescue-photos` (all public). Add policies so authenticated users can upload; see migration comments.
4. **Env**: In `frontend/`, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

After that, the frontend can use sign up/sign in, profiles, shelter pages with photos/community/chat, food rescue, community feed, and notifications.

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
