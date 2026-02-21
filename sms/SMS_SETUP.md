# Get SMS alerts working

## 1. Twilio credentials

1. Sign up at [twilio.com](https://www.twilio.com) and log in to the [Console](https://console.twilio.com).
2. From the dashboard copy your **Account SID** and **Auth Token**.
3. Get a phone number: **Phone Numbers → Manage → Buy a number**. Choose one with **SMS** capability (trial accounts can send only to verified numbers).
4. In this repo, open `sms/.env` and set:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+15551234567
   ```

## 2. Run the SMS service

From the **repo root**:

```bash
cd sms
pip install -r requirements.txt
python app.py
```

You should see the app run on **http://localhost:5000**. Leave this terminal open.

## 3. Run the frontend

In another terminal, from the repo root:

```bash
cd frontend
npm run dev
```

Open the URL shown (e.g. http://localhost:5173 or 5174). In dev the frontend already uses `http://localhost:5000` for SMS.

## 4. Test

1. On the homepage, scroll to **Get SMS alerts**.
2. Enter a 10-digit US phone number and click **Subscribe**.
3. If Twilio is configured, you get a welcome text. If not, you’ll see “Subscribed. (SMS not sent—check server Twilio config.)” and signup still works for the daily digest.

## 5. Daily digest (optional)

- The app sends a **daily SMS at 8:00 AM** (America/Chicago) to all subscribers while it’s running.
- To trigger a send manually: `GET http://localhost:5000/api/send-daily` (or set `CRON_SECRET` in `sms/.env` and call with `?key=your_secret`).

## Troubleshooting

- **“Could not reach the server”** — Make sure `python app.py` is running in `sms/` and nothing else is using port 5000.
- **“SMS not sent”** — Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in `sms/.env`. On a Twilio trial, the destination number must be [verified](https://console.twilio.com/us1/develop/phone-numbers/manage/verified).
- **Production** — Deploy the `sms/` app (e.g. Railway, Render), then set `VITE_SMS_API_URL` to its URL in your frontend env and rebuild.
