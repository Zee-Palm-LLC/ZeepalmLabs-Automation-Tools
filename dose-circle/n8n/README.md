# Dose Circle: n8n workflows

These are the eight workflows behind Dose Circle, exported from n8n. Credentials, workspace IDs and personal details have been removed, so they import cleanly into any n8n workspace.

| File | Workflow | Trigger | What it does |
|---|---|---|---|
| `0-engine.json` | Engine | Called by the other workflows | Loads the household from one data table, runs an operation, saves only the rows that changed and returns the texts to send |
| `1-dose-checkins.json` | Dose Check-ins | Every 5 minutes | Texts each dose as it comes due, nudges after 20 minutes, texts the family after 45 and 90 minutes, and logs missed doses after 3 hours |
| `2-replies.json` | Replies | Twilio messaging webhook, or called by the Dashboard API | Fixed rules catch emergencies, an extra dose, STOP and START. Claude describes everything else. The engine marks doses, logs readings, starts refills and texts the family when they're needed |
| `3-refill-watch.json` | Refill Watch | 10:00 every day | Texts the first contact about medicines with a week or less left |
| `4-sunday-update.json` | Sunday Update | Sundays at 18:00 | Emails the family the week's doses, readings, notes for the doctor and refills |
| `5-dashboard-api.json` | Dashboard API | Two webhooks | Serves the React dashboard and runs its buttons |
| `6-demo-family.json` | Demo Family | Manual | Builds 30 days of a made-up household, moved to today's dates |
| `9-error-alert.json` | Error Alert | Error trigger | Emails the first contact when any of the other workflows fails, so they can check on their parent directly |

## Why one engine

All the rules live in the **Run Engine** Code node of workflow 0, built from `src/demo/engine.js` and `src/demo/care.js` in this project. Every other workflow calls it with an operation:

| Operation | Used by | Does |
|---|---|---|
| `tick` | Dose Check-ins | Sends reminders, nudges and family alerts that are due, and logs missed doses |
| `refills` | Refill Watch | Starts a refill for every medicine running low |
| `prepare` | Replies | Builds the prompt for Claude, or skips Claude when a rule already applies |
| `handle` | Replies | Applies the text from a parent or family member |
| `digest` | Sunday Update | Builds the weekly email |
| `read`, `action` | Dashboard API | Returns the household, runs a dashboard button |
| `reset` | Demo Family, Dashboard API | Rebuilds the demo household |

The live demo in the browser runs the same functions, so what the dashboard shows and what the family receives never drift apart.

## Setup

### 1. Create the data table

In n8n, open **Overview > Data tables** and create one table called **dc_state** with three string columns:

| Column | Type | Holds |
|---|---|---|
| rid | string | The record id, like `p1`, `k3`, `d2a`, `settings` or `meta` |
| kind | string | settings, meta, person, member, med, dose, reading, alert, refill or message |
| data | string | The record as JSON |

### 2. Import the workflows

Import the files in order (**Workflows > Import from file**): `9-error-alert.json`, `0-engine.json`, `2-replies.json`, then the rest.

After importing, open each workflow and:

1. **Data table nodes:** pick **dc_state** in every node that shows `SELECT_DC_STATE_TABLE` (workflows 0 and 9).
2. **Engine calls:** in every **Execute Workflow** node that shows `SELECT_WORKFLOW_DOSE_CIRCLE_0_ENGINE`, pick workflow 0. In **Hand to Replies** (workflow 5), pick workflow 2.
3. **Twilio nodes:** add a Twilio credential (Account SID and Auth Token).
4. **Claude node** (workflow 2): use n8n's built-in AI credits or add an Anthropic credential.
5. **Gmail nodes** (workflows 4 and 9): connect a Gmail account.
6. **Workflow settings:** set the time zone of workflows 1, 3 and 4 to the family's time zone. Publish workflow 9, then set **Error workflow** to *Dose Circle 9 - Error Alert* in workflows 0 to 5.

### 3. Try it safely

1. Run **Demo Family** once. It writes the settings and fills the table.
2. Keep demo mode on. Every text is logged but nothing goes through Twilio, so you can test without a phone number.
3. Publish **Dashboard API** and **Replies**, point the React app at your workspace with `VITE_API_BASE` (see the main README) and use the two phones on the Live demo page. Replies are now read by Claude.

### 4. Set up a real family

1. Buy a number in Twilio and put it in **Texting number** in Settings.
2. In Twilio, set the number's **A message comes in** webhook to `https://your-workspace.app.n8n.cloud/webhook/dc-sms` (HTTP POST).
3. Replace the demo people, family and medicines in `dc_state` with your own, in the same shape as the demo, and set the reading limits with the doctor.
4. Publish workflows 1, 2, 3 and 4, then switch demo mode off in Settings.

## Before using it with real people

- Get consent from the person taking the medicines and from everyone in the circle.
- Business texting in the US needs A2P 10DLC registration. STOP and START are handled by rules, and anyone who opts out is never texted again.
- Add Header Auth to the Dashboard API webhooks and send the same header from the dashboard.
- Turn on Twilio request validation so only Twilio can post to the messaging webhook.
- Dose Circle is not a medical alert system. Keep a proper alert device for anyone at risk of falls.
