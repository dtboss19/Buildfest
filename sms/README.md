# SMS Alerts for Common Table

Opt-in by phone number; get SMS notifications about the **closest food shelves open today** (and other updates).

## Setup

1. **Twilio**
   - Sign up at [twilio.com](https://www.twilio.com) and get a phone number with SMS.
   - In Console: Account SID, Auth Token, and your Twilio phone number.

2. **Env**
   - Copy `.env.example` to `.env`.
   - Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.

3. **Run**
   ```bash
   pip install -r requirements.txt
   python app.py
   ```
   Service runs at `http://localhost:5000` (or set `PORT`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscribe` | Body: `{"phone": "6515551234"}` or `"+1 651-555-1234"`. Subscribes and sends welcome SMS. |
| POST | `/api/unsubscribe` | Body: `{"phone": "..."}`. Removes subscriber. |
| GET/POST | `/api/send-daily` | Sends today’s digest (closest open locations) to all subscribers. Optional `?key=CRON_SECRET`. |
| POST | `/api/analyze-food-image` | Body: `{"image": "data:image/...;base64,..."}`. Returns `{ ok, items: [{ name, quantity, details }] }` using Claude (Anthropic) vision. Set `ANTHROPIC_API_KEY` in .env. |
| GET | `/api/health` | Returns `{ ok, subscribers }`. |

## Daily digest

The app **sends the daily SMS automatically at 8:00 AM** (America/Chicago) while it is running. No separate cron needed.

Optional env vars to change the time:
- `SCHEDULE_HOUR=8` (0–23)
- `SCHEDULE_MINUTE=0`
- `SCHEDULE_TZ=America/Chicago` (any `zoneinfo` name, e.g. `America/New_York`)

You can also trigger a send manually: `GET /api/send-daily` or with `?key=CRON_SECRET` if set. Message content: list of food shelves open **today** closest to campus, plus unsubscribe note.

## Frontend

The React app has an “SMS alerts” section. Set `VITE_SMS_API_URL` (or leave unset to hide the section) to your SMS service URL, e.g. `http://localhost:5000` for local dev.
