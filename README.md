# St. Thomas Campus Food Shelf — Nearby Resources

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

## Tech

- **Frontend** (`frontend/`): React 18 + TypeScript, Vite 5, Leaflet/react-leaflet for map. Purple and white theme; two-column layout (calendar + list left, map right); SMS signup in left panel.
- No backend for calendar data; uploaded images in `localStorage`. Optional Python SMS bot in `sms/` (Twilio + SQLite).
