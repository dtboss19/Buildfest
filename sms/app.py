"""
SMS alert bot + food image analysis for Common Table.
- Opt-in by phone; daily SMS with closest open locations (Twilio).
- POST /api/analyze-food-image: AI detects food and quantity in uploaded photos (Claude / Anthropic vision).
"""
import json
import os
import re
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.rest import Client

load_dotenv()

# #region agent log
def _debug_log(location: str, message: str, data: dict, hypothesis_id: str) -> None:
    import json as _j
    log_path = Path(__file__).resolve().parent.parent / "debug-f0ee74.log"
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(_j.dumps({"sessionId": "f0ee74", "location": location, "message": message, "data": data, "hypothesisId": hypothesis_id, "timestamp": __import__("time").time() * 1000}) + "\n")
    except Exception:
        pass
# #endregion

app = Flask(__name__)
CORS(app)
DB_PATH = Path(__file__).resolve().parent / "subscribers.db"
SHELTERS_PATH = Path(__file__).resolve().parent / "shelters.json"

# Twilio (optional for subscribe endpoint; required for sending)
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS subscribers (phone TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
        )


def normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        return "+1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    return None


def load_shelters():
    # #region agent log
    try:
        with open(SHELTERS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        _debug_log("load_shelters", "ok", {"path": str(SHELTERS_PATH)}, "H1")
        return data
    except Exception as e:
        _debug_log("load_shelters", "error", {"error": str(e), "path": str(SHELTERS_PATH)}, "H1")
        raise
    # #endregion


def open_today(shelters: list, day: int) -> list:
    """day 0=Sun, 6=Sat. Return shelters open today, sorted by distance."""
    out = [s for s in shelters if any(e["day"] == day for e in s["schedule"])]
    return sorted(out, key=lambda s: s["distanceMiles"])


def _format_time(hhmm: str) -> str:
    """e.g. 10:00 -> 10am, 14:00 -> 2pm."""
    try:
        h, m = int(hhmm[:2]), int(hhmm[3:5]) if len(hhmm) >= 5 else 0
        if h == 0:
            return "12am" if m == 0 else f"12:{m:02d}am"
        if h == 12:
            return "12pm" if m == 0 else f"12:{m:02d}pm"
        if h < 12:
            return f"{h}am" if m == 0 else f"{h}:{m:02d}am"
        return f"{h - 12}pm" if m == 0 else f"{h - 12}:{m:02d}pm"
    except (ValueError, IndexError):
        return hhmm


def _format_slots(slots: list) -> str:
    """Format list of {open, close} into e.g. '10am-12pm, 2-4pm'."""
    if not slots:
        return ""
    parts = []
    for slot in slots:
        o = slot.get("open", "")
        c = slot.get("close", "")
        if o and c:
            parts.append(f"{_format_time(o)}-{_format_time(c)}")
    return ", ".join(parts)


def build_daily_message(day: int) -> str:
    try:
        shelters = load_shelters()
    except Exception as e:
        _debug_log("build_daily_message", "load_shelters_failed", {"error": str(e)}, "H1")
        return "Common Table: Alerts temporarily unavailable. Call 1-888-711-1151. Reply STOP to unsubscribe."
    try:
        open_list = open_today(shelters, day)[:5]
        day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        day_name = day_names[day]
        if not open_list:
            return f"Common Table: No locations open {day_name}. Call 1-888-711-1151. Reply STOP to unsubscribe."
        lines = [f"Food shelves open {day_name} (near campus):"]
        for s in open_list:
            entry = next((e for e in s["schedule"] if e["day"] == day), None)
            hours = _format_slots(entry.get("slots", [])) if entry else ""
            note = f" ({entry['note']})" if entry and entry.get("note") else ""
            lines.append(f"• {s['name']} ({s['distanceMiles']} mi)")
            lines.append(f"  {s.get('address', '')}")
            if hours:
                lines.append(f"  Hours: {hours}{note}")
            lines.append(f"  Req: {s.get('eligibility', 'Call for details.')}")
            if s.get("contact"):
                lines.append(f"  Call: {s['contact']}")
        lines.append("Reply STOP to unsubscribe.")
        return "\n".join(lines)
    except Exception as e:
        _debug_log("build_daily_message", "format_failed", {"error": str(e)}, "H1")
        return "Common Table: Alerts temporarily unavailable. Call 1-888-711-1151. Reply STOP to unsubscribe."


def send_sms(to: str, body: str) -> bool:
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
        return False
    try:
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(body=body, to=to, from_=TWILIO_FROM)
        return True
    except Exception:
        return False


def run_daily_send(day: int | None = None) -> tuple[int, int]:
    """Send today's digest to all subscribers. Returns (subscriber_count, sent_count)."""
    from datetime import datetime
    # #region agent log
    _debug_log("run_daily_send", "entry", {"day_arg": day}, "H4")
    # #endregion
    try:
        if day is None:
            day = (datetime.now().weekday() + 1) % 7  # Sun=0 .. Sat=6
        body = build_daily_message(day)
        with get_db() as conn:
            rows = conn.execute("SELECT phone FROM subscribers").fetchall()
        sent = 0
        for row in rows:
            if send_sms(row["phone"], body):
                sent += 1
        # #region agent log
        _debug_log("run_daily_send", "ok", {"subscribers": len(rows), "sent": sent}, "H4")
        # #endregion
        return (len(rows), sent)
    except Exception as e:
        # #region agent log
        _debug_log("run_daily_send", "error", {"error": str(e)}, "H4")
        # #endregion
        raise


@app.route("/api/subscribe", methods=["POST"])
def subscribe():
    data = request.get_json() or {}
    phone = normalize_phone((data.get("phone") or "").strip())
    if not phone:
        return jsonify({"ok": False, "error": "Invalid phone number"}), 400
    try:
        with get_db() as conn:
            conn.execute("INSERT OR REPLACE INTO subscribers (phone) VALUES (?)", (phone,))
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    welcome = "You're signed up for Common Table alerts. We'll text you which locations are open and closest to campus. Reply STOP to unsubscribe."
    if send_sms(phone, welcome):
        return jsonify({"ok": True, "message": "Subscribed. Check your phone for confirmation."})
    return jsonify({"ok": True, "message": "Subscribed. (SMS not sent—check server Twilio config.)"})


@app.route("/api/unsubscribe", methods=["POST"])
def unsubscribe():
    data = request.get_json() or {}
    phone = normalize_phone((data.get("phone") or "").strip())
    if not phone:
        return jsonify({"ok": False, "error": "Invalid phone number"}), 400
    with get_db() as conn:
        conn.execute("DELETE FROM subscribers WHERE phone = ?", (phone,))
    return jsonify({"ok": True, "message": "Unsubscribed."})


@app.route("/api/send-daily", methods=["GET", "POST"])
def send_daily():
    """Send today's digest to all subscribers. Call from cron or manually. Optional ?key=CRON_SECRET."""
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret and request.args.get("key") != cron_secret:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    day = request.args.get("day", type=int)
    subscribers, sent = run_daily_send(day)
    return jsonify({"ok": True, "subscribers": subscribers, "sent": sent})


@app.route("/api/health", methods=["GET"])
def health():
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM subscribers").fetchone()[0]
    return jsonify({"ok": True, "subscribers": count})


# --- Food image analysis (Claude / Anthropic Vision) ---
FOOD_ANALYSIS_PROMPT = """You are analyzing a photo of food at a food shelf, pantry, or donation table.
List every food item clearly visible in the image.
For each item provide:
- name: short name (e.g. "Canned beans", "Apples", "Bread")
- quantity: estimate (e.g. "about 10 cans", "a dozen", "3 bags", "several")
- details: optional brief note (e.g. "canned", "fresh", "whole grain")

Return ONLY a valid JSON array of objects with keys: name, quantity, details (details can be empty string).
Example: [{"name": "Canned corn", "quantity": "about 8 cans", "details": ""}, {"name": "Bananas", "quantity": "~6", "details": "slightly ripe"}]
If no food is clearly visible, return: []"""


def _parse_data_url(data_url: str) -> tuple[str, str] | None:
    """Return (media_type, base64_data) or None. media_type e.g. image/jpeg, image/png."""
    if not data_url or not data_url.startswith("data:image"):
        return None
    try:
        header, _, b64 = data_url.partition(",")
        # header is like "data:image/png;base64" or "data:image/jpeg"
        if ";base64" in header:
            mt = header.split(";")[0].replace("data:", "").strip()
        else:
            mt = header.replace("data:", "").strip() or "image/jpeg"
        if not b64 or not mt.startswith("image/"):
            return None
        return (mt, b64.strip())
    except Exception:
        return None


def analyze_food_image(image_data_url: str) -> dict | None:
    """Call Claude (Anthropic) Vision; return { items: [ { name, quantity, details } ] } or None on failure."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    parsed = _parse_data_url(image_data_url)
    if not parsed:
        return None
    media_type, base64_data = parsed
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
        resp = client.messages.create(
            model=model,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": base64_data},
                        },
                        {"type": "text", "text": FOOD_ANALYSIS_PROMPT},
                    ],
                }
            ],
        )
        text = (resp.content[0].text if resp.content else "").strip()
        if "```" in text:
            start = text.find("[")
            end = text.rfind("]") + 1
            if start != -1 and end > start:
                text = text[start:end]
        items = json.loads(text)
        if not isinstance(items, list):
            return None
        out = []
        for x in items:
            if isinstance(x, dict) and "name" in x and "quantity" in x:
                out.append({
                    "name": str(x.get("name", "")),
                    "quantity": str(x.get("quantity", "")),
                    "details": str(x.get("details", "") or ""),
                })
        return {"items": out}
    except Exception:
        return None


@app.route("/api/analyze-food-image", methods=["POST"])
def analyze_food():
    """Body: JSON { \"image\": \"data:image/...;base64,...\" }. Returns { ok, items: [...] } or { ok: false, error }."""
    data = request.get_json() or {}
    image = data.get("image") or ""
    if not image:
        return jsonify({"ok": False, "error": "Missing image (data URL)"}), 400
    result = analyze_food_image(image)
    if result is None:
        return jsonify({
            "ok": False,
            "error": "Analysis unavailable. Set ANTHROPIC_API_KEY in the server .env to enable.",
        }), 503
    return jsonify({"ok": True, "items": result.get("items", [])})


def build_assistant_context() -> str:
    """Build current date, day, open-today list, and full shelter summary for the AI assistant."""
    from datetime import datetime
    now = datetime.now()
    day = now.weekday()  # Python: Mon=0 .. Sun=6
    # Convert to Sun=0 for our data: (day + 1) % 7
    day_sun_first = (day + 1) % 7
    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    day_name = day_names[day_sun_first]
    date_str = now.strftime("%A, %B %d, %Y")
    try:
        shelters = load_shelters()
    except Exception:
        return f"Today is {date_str} ({day_name}). Shelter data temporarily unavailable."
    open_today_list = open_today(shelters, day_sun_first)
    lines = [
        f"Today is {date_str} ({day_name}).",
        f"Number of food shelves open today: {len(open_today_list)}.",
        "",
        "=== SHELTERS OPEN TODAY (with hours) ===",
    ]
    for s in open_today_list:
        entry = next((e for e in s["schedule"] if e["day"] == day_sun_first), None)
        hours = _format_slots(entry.get("slots", [])) if entry else ""
        note = f" ({entry['note']})" if entry and entry.get("note") else ""
        lines.append(f"- {s['name']}: {s.get('address', '')} — {s['distanceMiles']} mi from campus. Hours today: {hours}{note}. Eligibility: {s.get('eligibility', '')}. Contact: {s.get('contact', 'N/A')}.")
    lines.append("")
    lines.append("=== ALL FOOD SHELTERS (for other days) ===")
    for s in shelters:
        days_open = []
        for e in s.get("schedule", []):
            d = e.get("day", 0)
            if 0 <= d <= 6:
                days_open.append(day_names[d])
        days_str = ", ".join(days_open) if days_open else "Call for hours"
        lines.append(f"- {s['name']}: {s.get('address', '')} — {s['distanceMiles']} mi. Open: {days_str}. Eligibility: {s.get('eligibility', '')}. Contact: {s.get('contact', 'N/A')}.")
    return "\n".join(lines)


ASSISTANT_SYSTEM = """You are the friendly assistant for Common Table, an app that connects people with food shelves and free food resources near the University of St. Thomas in St. Paul, MN. Be warm, practical, and never condescending. Answer in 2–4 short sentences unless the user asks for more detail. Always end with a clear next step (e.g. "Check the calendar on the home page for other days" or "Call them to confirm hours.").

Use ONLY the data below. Do not invent shelter names, addresses, or hours. If asked about a day, use the schedule. If asked about "now" or "today", use "SHELTERS OPEN TODAY". If nothing is open today and they need food, suggest the Minnesota Food Helpline: 1-888-711-1151 (Mon–Fri 10am–5pm).

Current data:
{context}"""


@app.route("/api/ask-assistant", methods=["POST"])
def ask_assistant():
    """Body: JSON { \"message\": \"...\" } or { \"message\": \"...\", \"history\": [{\"role\":\"user\"|\"assistant\", \"content\":\"...\"}] }. Returns { \"ok\": true, \"reply\": \"...\" }."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return jsonify({"ok": False, "error": "Assistant unavailable. Set ANTHROPIC_API_KEY."}), 503
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"ok": False, "error": "Missing message"}), 400
    context = build_assistant_context()
    system = ASSISTANT_SYSTEM.format(context=context)
    history = data.get("history") or []
    messages = []
    for h in history[-10:]:  # keep last 10 turns
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
        resp = client.messages.create(
            model=model,
            max_tokens=500,
            system=system,
            messages=messages,
        )
        reply = (resp.content[0].text if resp.content else "").strip()
        return jsonify({"ok": True, "reply": reply or "I couldn't generate a response. Try asking which food shelves are open today."})
    except Exception as e:
        err_str = str(e).lower()
        if "credit" in err_str or "balance" in err_str or "billing" in err_str or "invalid_request" in err_str:
            reply = (
                "I'm temporarily unable to use the AI, but here's the latest info we have:\n\n"
                + context
                + "\n\nYou can also browse food shelves on the Find Food page, or call the Minnesota Food Helpline: 1-888-711-1151 (Mon–Fri 10am–5pm)."
            )
            return jsonify({"ok": True, "reply": reply})
        return jsonify({"ok": False, "error": "The assistant is temporarily unavailable. Please try again later."}), 503


def start_scheduler():
    """Schedule daily SMS at 8:00 AM (timezone from SCHEDULE_TZ, default America/Chicago for St. Paul)."""
    hour = int(os.getenv("SCHEDULE_HOUR", "8"))
    minute = int(os.getenv("SCHEDULE_MINUTE", "0"))
    tz_name = os.getenv("SCHEDULE_TZ", "America/Chicago")
    from zoneinfo import ZoneInfo
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    scheduler = BackgroundScheduler(timezone=ZoneInfo(tz_name))
    scheduler.add_job(
        run_daily_send,
        CronTrigger(hour=hour, minute=minute),
        id="daily_sms",
    )
    scheduler.start()
    return scheduler


if __name__ == "__main__":
    init_db()
    start_scheduler()
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
