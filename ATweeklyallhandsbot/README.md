# AT Weekly All-Hands Bot

Telegram bot that sends friendly, dynamic reminders for your weekly all-hands to a group. Reminders include meeting date and time in **Beijing time** and a permanent link to your meeting notes template.

## Features

- **Recurring schedule** — Set the day of week (0–6) and time (Beijing). Reminder is sent 24 hours before the meeting.
- **One-off cancel** — Skip the reminder for the next occurrence only; the following week continues as usual.
- **Dynamic reminders** — Uses OpenAI to generate a short, friendly, fun reminder (or a random fallback if no API key).
- **Meeting notes link** — Every reminder includes a permanent link to your meeting notes template (set in env).

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Add the bot to your Telegram group. Use `/get_id` in the group to get `TARGET_GROUP_ID`.
3. Copy `.env.example` to `.env` and set:
   - `BOT_TOKEN` — from BotFather
   - `TARGET_GROUP_ID` — group chat ID (negative number)
   - `MEETING_LINK` — permanent URL to your meeting notes template
   - `OPENAI_API_KEY` — (optional) for dynamic reminder text; without it, a random fallback message is used
4. Install and run:

```bash
npm install
npm run build
npm start
```

For development: `npm run dev`

## Commands (in the group or with the bot)

| Command | Description |
|--------|-------------|
| `/set_schedule <day> <hour> <minute>` | Set recurring reminder. Day: 0=Sun … 6=Sat. Time in Beijing. |
| `/cancel_this_week` | One-off cancel: no reminder for the next scheduled meeting. |
| `/uncancel_this_week` | Restore reminder for that date. |
| `/test_reminder` | Send a test reminder now (no schedule change). |
| `/get_id` | Show chat/group ID (for `TARGET_GROUP_ID`). |

## Example

```text
/set_schedule 2 14 0
```
→ Meeting every **Tuesday** at **14:00 Beijing time**. Reminder is sent **Monday** 14:00 Beijing (24h before).

## Data

- Schedule and one-off cancellations are stored in `atweeklyallhands.db` (SQLite). Override path with `DB_PATH` in `.env`.

## Deploy on Render

1. Push this repo to GitHub and connect it to [Render](https://render.com).
2. Create a **Background Worker** (or use the **Blueprint** from `render.yaml`).
3. Set **Environment** variables in the Render dashboard:
   - `BOT_TOKEN` — from BotFather
   - `TARGET_GROUP_ID` — group chat ID (negative number)
   - `MEETING_LINK` — permanent URL to your meeting notes template
   - `OPENAI_API_KEY` — (optional) for dynamic reminder text
4. If using the Blueprint: `DB_PATH` is set to `/data/atweeklyallhands.db` and a 1 GB disk is mounted at `/data` so the SQLite DB persists.
5. **Build command:** `npm install && npm run build`  
   **Start command:** `npm start`

Render will install dependencies, compile TypeScript, and run the bot. The worker stays running and uses node-schedule for the recurring reminder.
