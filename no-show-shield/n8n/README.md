# No-Show Shield: n8n workflows

These are the eight workflows behind No-Show Shield, exported from n8n. Credentials, workspace IDs and personal details have been removed, so they import cleanly into any n8n workspace.

| File | Workflow | Trigger | What it does |
|---|---|---|---|
| `0-engine.json` | Engine | Called by the other workflows | Loads the clinic from one data table, runs an operation, saves only the rows that changed and returns what to text |
| `1-reminders.json` | Reminders | Every 15 minutes | Texts reminders 72 hours, 24 hours and 2 hours before each visit, outside quiet hours |
| `2-patient-replies.json` | Patient Replies | Twilio messaging webhook, or called by the Dashboard API | Fixed rules catch STOP, START, health worries and call-back requests. Claude reads everything else. The engine confirms, moves, cancels or books from the waitlist and alerts the front desk when a person is needed |
| `3-waitlist-offers.json` | Waitlist Offers | Every 5 minutes | Expires offers nobody answered and sends the time to the next three matches |
| `4-morning-call-list.json` | Morning Call List | 7:30 on clinic days | Emails the front desk the unconfirmed high-risk visits for the next two clinic days and any open health concerns |
| `5-dashboard-api.json` | Dashboard API | Two webhooks | Serves the React dashboard and runs its buttons |
| `6-demo-clinic.json` | Demo Clinic | Manual | Builds 30 days of a made-up dental clinic, moved to today's dates |
| `9-error-alert.json` | Error Alert | Error trigger | Emails the front desk when any of the other workflows fails |

## Why one engine

All the rules live in the **Run Engine** Code node of workflow 0, built from `src/demo/engine.js` and `src/demo/desk.js` in this project. Every other workflow calls it with an operation:

| Operation | Used by | Does |
|---|---|---|
| `reminders` | Reminders | Finds visits due a reminder and writes the texts |
| `offers` | Waitlist Offers | Expires stale offers and re-offers the time |
| `prepare` | Patient Replies | Builds the prompt for Claude, or skips Claude when a rule already applies |
| `handle` | Patient Replies | Applies the reply: confirm, move, cancel, accept an offer, flag for a person |
| `call-list` | Morning Call List | Builds the call list email |
| `read`, `action` | Dashboard API | Returns the clinic, runs a dashboard button |
| `reset` | Demo Clinic, Dashboard API | Rebuilds the demo clinic |

The live demo in the browser runs the same functions, so what the dashboard shows and what patients receive never drift apart.

## Setup

### 1. Create the data table

In n8n, open **Overview > Data tables** and create one table called **nss_state** with three string columns:

| Column | Type | Holds |
|---|---|---|
| rid | string | The record id, like `a12`, `p3`, `settings` or `meta` |
| kind | string | settings, meta, patient, appt, wait, offer or message |
| data | string | The record as JSON |

### 2. Import the workflows

Import the files in order (**Workflows > Import from file**): `9-error-alert.json`, `0-engine.json`, `2-patient-replies.json`, then the rest.

After importing, open each workflow and:

1. **Data table nodes:** pick **nss_state** in every node that shows `SELECT_NSS_STATE_TABLE` (workflows 0 and 9).
2. **Engine calls:** in every **Execute Workflow** node that shows `SELECT_WORKFLOW_NO_SHOW_SHIELD_0_ENGINE`, pick workflow 0. In **Hand to Patient Replies** (workflow 5), pick workflow 2.
3. **Twilio nodes:** add a Twilio credential (Account SID and Auth Token).
4. **Claude node** (workflow 2): use n8n's built-in AI credits or add an Anthropic credential.
5. **Gmail nodes** (workflows 4 and 9): connect a Gmail account.
6. **Workflow settings:** publish workflow 9, then set **Error workflow** to *No-Show Shield 9 - Error Alert* in workflows 0 to 5.

### 3. Try it safely

1. Run **Demo Clinic** once. It writes the settings and fills the table.
2. Keep demo mode on. Every text is logged but nothing goes through Twilio, so you can test without a phone number.
3. Publish **Dashboard API** and **Patient Replies**, point the React app at your workspace with `VITE_API_BASE` (see the main README) and use the demo phone on the Live page. Replies are now read by Claude.

### 4. Connect a real number

1. Buy a number in Twilio and put it in **Texting number** in Settings. Put the front desk mobile in **Front desk line** and the front desk email in **Front desk email**.
2. In Twilio, set the number's **A message comes in** webhook to `https://your-workspace.app.n8n.cloud/webhook/nss-sms` (HTTP POST).
3. Publish workflows 1, 2, 3 and 4, then switch demo mode off in Settings.
4. Load your real schedule into `nss_state`, or connect your practice management system and write appointments in the same shape as the demo.

## Before using real patient data

- Sign a BAA with Twilio and Anthropic, or use providers that will sign one, before any patient data passes through them.
- Keep **Keep treatment out of texts** on.
- Add Header Auth to the Dashboard API webhooks and send the same header from the dashboard.
- Turn on Twilio request validation so only Twilio can post to the messaging webhook.
- Business texting in the US needs A2P 10DLC registration. STOP and START are handled by rules, and opted-out patients are never texted again.
