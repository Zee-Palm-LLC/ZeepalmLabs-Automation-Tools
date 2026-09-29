# Missed Call Text-Back

Every missed call gets a text back within seconds. The AI replies to the customer, works out what the job is and how urgent it is, checks the ZIP code, offers open times and books the job. The owner only hears about the calls that need them: emergencies and people who ask for a call back.

The demo business is BrightFlow Plumbing & Heating, a two-van plumber in Austin. Plumbers miss calls all day because they're on jobs, and a caller who gets no answer usually rings the next plumber on Google.

- **Live demo:** [missed-call-text-back.vercel.app](https://missed-call-text-back.vercel.app). Call the demo line on the phone and let it ring out. Everything runs in your browser, so nothing is sent.

## How it works

1. **Ring the owner first.** Calls to the Twilio number are forwarded to the owner's mobile for 20 seconds.
2. **Text back when nobody answers.** The caller hears a short message and gets an SMS within seconds. After hours the text says the business is closed but still takes emergencies.
3. **Work out the job.** Claude reads each reply with the price list, service area and open slots, and answers like a person at the front desk. It fills in a job ticket as it goes: problem, urgency, ZIP code, time and name.
4. **Book it or escalate it.** Routine jobs are booked into the first free slots. A burst pipe, sewage or a gas smell gets safety advice and an instant text to the owner. People who ask for a person get a call-back request.
5. **Follow up and report.** Callers who never reply get one nudge after 30 minutes and a last one the next day. The owner gets a daily summary email at 6pm.

STOP and START are handled by fixed rules, not the AI, and opted-out numbers are never texted again, even if they call.

## Pages

| Page | What it does |
|---|---|
| Live | The demo phone, the step-by-step timeline of the rescue, the job ticket the AI fills in, the last 30 days in numbers and every missed call as a tile |
| Inbox | Every conversation, filterable. Read the thread, take over from the AI, text the customer yourself, hand it back, or mark it handled |
| Calls | When calls get missed by day and hour, and the full call log with text-back times |
| Jobs | Jobs that started as a missed call, coming up and booked in the last 30 days |
| Settings | Business details, hours and slots, service area, text-back messages, follow-up timing, prices and the AI switch |

## Two ways to run it

Requires Node 20 or newer. Run `npm install` first.

| Mode | Command | Data |
|---|---|---|
| Connected | `npm run dev`, then open http://localhost:5192 | Your n8n workflows. The **Dashboard API** workflow must be published. |
| Public demo | `npm run build:demo` | A demo business generated in the browser (`src/demo/`). No n8n, Twilio or Claude calls. |

In the public demo the replies come from a scripted stand-in (`src/demo/engine.js`) that follows the same steps as Claude, so the demo costs nothing to run.

### Connected mode

Create `.env.local` with your n8n webhook address:

```bash
VITE_API_BASE=https://your-workspace.app.n8n.cloud/webhook
```

The Dashboard API workflow provides:

- `GET /mctb-api`: settings, leads, calls, messages and 30-day stats
- `POST /mctb-action?action=call&phone=...`: simulate a missed call
- `POST /mctb-action?action=sms&phone=...&body=...`: simulate a customer text
- `POST /mctb-action?action=send&lead=...&body=...`: text a customer as the owner (pauses the AI for that conversation)
- `POST /mctb-action?action=pause|ack|status&lead=...`: take over, mark handled or change a status
- `POST /mctb-action?action=settings&...`: save settings
- `POST /mctb-action?action=reset`: reload the demo business (demo mode only)

Before real customers use it, add Header Auth to the webhooks and send the same header from `src/lib/api.js`, then switch demo mode off in Settings.

## Deploying

Deploy to Vercel as a Vite project with **Root Directory** `missed-call-text-back`, **Build Command** `npm run build:demo` and **Output Directory** `dist`. `vercel.json` sends every path to `index.html`, so routes like `/inbox` work on refresh.

## Folder

- `src/pages`: one file per page
- `src/components`: the phone, the rescue timeline, the job ticket and shared pieces
- `src/state/DeskProvider.jsx`: data loading, the demo call and every action
- `src/lib/api.js`: switches between the n8n webhooks and the in-browser demo
- `src/demo/`: the scripted stand-in for Claude, the slot finder and the demo business
- `scripts/og.mjs`: draws the link preview image at build time
- `scripts/demo-data.mjs`: writes `n8n/demo-business.json` for the n8n demo workflow
- `n8n/`: the seven n8n workflows and how to set them up
