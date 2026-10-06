# No-Show Shield

Appointment reminders patients can answer in their own words, a call list for the patients most likely to miss, and a waitlist that refills cancelled times in minutes.

Missed appointments are one of the most expensive everyday problems in healthcare. A clinic loses the slot, the provider's time and often the patient's care plan. No-Show Shield texts each patient before their visit, understands the reply ("can't make Thursday, anything Friday morning?"), moves or confirms the visit against the real schedule, and offers every freed time to the best matches on the waitlist. The first YES gets it.

The demo clinic is Willow Creek Dental in Austin: two dentists, one hygienist and about 20 visits a day. Every patient, phone number and message is made up.

- **Live demo:** [zeepalm-no-show-shield.vercel.app](https://zeepalm-no-show-shield.vercel.app). Pick a patient story on the demo phone and reply to the reminder. Everything runs in your browser, so nothing is sent and no AI is called.

## How it works

1. **Remind at the right times.** Every 15 minutes, visits 72 hours, 24 hours and 2 hours away get a text. Nothing goes out in quiet hours, and patients who already confirmed skip the 24-hour reminder.
2. **Say as little as possible.** Texts name the time and the provider, never the treatment.
3. **Read the reply.** STOP, START, health worries and call-back requests are caught by fixed rules first. Everything else goes to Claude, which only works out what the patient wants: confirm, move, cancel, a question, running late, or yes to an open spot. The reply itself is written by tested rules against the real schedule, so the AI never invents a time.
4. **Keep medicine with people.** Anything that sounds clinical, like pain, swelling, bleeding or medicine, gets no advice. The patient is told a clinician will call and pointed to 911 if it feels like an emergency, and the front desk gets a text straight away.
5. **Refill every freed time.** When a patient cancels or moves, the three best matches on the waitlist get an offer at once: right length of visit, right provider, a time window they asked for, longest wait first, urgent cases ahead. If nobody answers within 20 minutes, the next three get it.
6. **Call the risky ones first.** Each visit gets a risk score from plain rules: past no-shows, no reply to the reminder, booked weeks ahead, first visit, late cancellations and a few slot patterns. At 7:30 on clinic days the front desk gets an email with everyone at 60 or more who hasn't replied.

## Pages

| Page | What it does |
|---|---|
| Dashboard | No-shows avoided and revenue protected, the no-show rate against the rate before, today's chairs as a live timeline, kept, refilled and missed visits per day, what patients texted back, who to call first, live activity and waitlist backfill |
| Live demo | Be the patient. Six stories: confirm, reschedule, take a cancelled spot, ask a question, raise a health concern or type your own. Shows what happened in order, the visit with its live risk score, and the waitlist offer as it fills. Also opens as an overlay from anywhere with **Try it as a patient** |
| Schedule | Twelve clinic days, every chair as a timeline, an agenda with reminder progress and risk, and a visit panel to send a reminder, log a call, check a patient in, mark a no-show or cancel and offer the time to the waitlist |
| Inbox | Every text conversation, with what the AI understood under each reply, notes for each change, take over and hand back, and the patient's next visit, risk and history |
| Call list | Unconfirmed high-risk visits for the next two clinic days with the reasons, one-click call outcomes and how the score is worked out |
| Waitlist | Open times being offered right now and recent refills, plus the waitlist with urgent flags |
| Settings | Clinic details, reminder timing and templates with live previews, waitlist rules, the call list threshold, privacy and quiet hours, the AI switch and demo reset |

Across the app: a command menu (Ctrl or Cmd and K), notifications for anything that needs a person, dark and light themes, and a sidebar that becomes a slide-out menu on phones.

## Two ways to run it

Requires Node 20 or newer. Run `npm install` first.

| Mode | Command | Data |
|---|---|---|
| Connected | `npm run dev`, then open http://localhost:5193 | Your n8n workflows. The **Dashboard API** workflow must be published. |
| Public demo | `npm run build:demo` | A demo clinic built in the browser (`src/demo/`). No n8n, Twilio or Claude calls. |

The public demo and the n8n workflows run the same code. `src/demo/engine.js` (risk, open times, reading replies) and `src/demo/desk.js` (reminders, replies, moves, cancels and waitlist offers) are bundled into the n8n **Engine** workflow, so what you see in the demo is what the workflows do. In the demo, a keyword reader stands in for Claude.

### Connected mode

Create `.env.local` with your n8n webhook address:

```bash
VITE_API_BASE=https://your-workspace.app.n8n.cloud/webhook
```

The Dashboard API workflow provides:

- `GET /nss-api`: settings, patients, appointments, waitlist, offers and messages
- `POST /nss-action?action=start&scenario=...`: start a demo patient story
- `POST /nss-action?action=sms&phone=...&body=...`: text the clinic as the demo patient
- `POST /nss-action?action=send|pause|ack|read&patient=...`: text a patient as the front desk, take over, mark handled or mark read
- `POST /nss-action?action=remind|confirm|call|outcome|cancel|offer&appt=...`: work a visit
- `POST /nss-action?action=waitlist-remove|waitlist-priority&wait=...`: manage the waitlist
- `POST /nss-action?action=settings&...`: save settings
- `POST /nss-action?action=reset`: rebuild the demo clinic (demo mode only)

Before real patients use it, add Header Auth to the webhooks and send the same header from `src/lib/api.js`, then switch demo mode off in Settings.

## Deploying

Deploy to Vercel as a Vite project with **Root Directory** `no-show-shield`, **Build Command** `npm run build:demo` and **Output Directory** `dist`. `vercel.json` sends every path to `index.html`, so routes like `/schedule` work on refresh.

## Folder

- `src/pages`: one file per page
- `src/components`: the app shell and command menu (`Shell.jsx`), charts and chair lanes (`charts.jsx`), UI building blocks (`ui.jsx`), the risk meter, the waitlist offer board, the phone and the live stage
- `src/state/DeskProvider.jsx`: data loading, the demo patient stories and every action
- `src/state/UiProvider.jsx`: theme, sidebar, command menu and overlay state
- `src/lib/metrics.js`: rates, daily series, reply mix, call list and activity derived from the data
- `src/lib/api.js`: switches between the n8n webhooks and the in-browser demo
- `src/demo/`: the shared engine, the demo clinic and the patient stories
- `public/og.png`: the link preview image
- `n8n/`: the eight n8n workflows and how to set them up

## Not medical software

This is a scheduling and messaging tool. It does not diagnose, triage or advise, and it hands anything clinical to a person. If you use it with real patients, check your local rules for patient messaging (in the US, HIPAA and TCPA), sign a BAA with your SMS and AI providers, and keep texts to the minimum necessary.
