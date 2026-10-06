# Dose Circle

Medicine check-ins by text for an older parent who lives on their own. They answer in their own words, and the family only hears about it when something needs them.

About half of people on long-term medicines don't take them as prescribed. For an older parent on five or ten pills a day, a forgotten dose or a quiet "I stopped the white one, it upsets my stomach" usually goes unnoticed until the next doctor visit. Families end up calling every evening to ask "did you take your pills?".

Dose Circle texts each dose when it's due, listing every pill by what it looks like ("the big white oval one"), because that's how people talk about pills. Mom answers however she likes on any phone that gets texts. "took them", "not the big white one, it makes me queasy", "in 20 minutes", "BP 150/95" and "only 3 of the yellow ones left" all work. Nobody needs an app, a login or a smartphone.

The demo household is the Delgados in Tampa: Rosa, 78, and Tomás, 81, ten medicines between them, and a circle of three (their daughter Ana, their son Marco and June next door). Every name, phone number and reading is made up.

- **Live demo:** [zeepalm-dose-circle.vercel.app](https://zeepalm-dose-circle.vercel.app). Open **Live demo**, pick what Mom does with her reminder, and watch Mom's phone, Ana's phone and every step in between. Everything runs in your browser, so nothing is sent and no AI is called.

## How it works

1. **Remind at each dose.** Every 5 minutes, doses coming due get a text listing each pill with its strength, what it looks like and whether to take it with food.
2. **Read the reply.** STOP, START, chest pain, trouble breathing, a fall, stroke signs and an extra dose are caught by fixed rules first. Everything else goes to Claude, which only describes the message: taken, partly taken (and which pill), later, skipped, a reading, running low, not feeling well, a question or wants a call. The reply itself is written by tested rules against the real medicine list.
3. **Climb a gentle ladder when it goes quiet.** No reply after 20 minutes gets one friendly nudge. After 45 minutes the first contact in the family is texted. After 90 minutes, if nobody has said ON IT, the backups are texted. After 3 hours the dose is logged as missed. Family texts wait for the end of quiet hours.
4. **Let the family answer by text.** DONE marks the pills as taken, ON IT stops the ladder and tells the others, ORDERED and PICKED UP move a refill along, and STATUS returns today's summary.
5. **Keep medicine with people.** Dose Circle never says what a symptom or a reading means. A possible emergency texts everyone in the circle at once, at any hour, and tells Mom to call 911. An extra dose points her to Poison Control. Medicine questions are passed to the family and the pharmacist.
6. **Watch the numbers.** Blood pressure, blood sugar and weight texted in are logged and charted. Anything outside the range the family set with the doctor goes to the first contact, as does a fast weight gain.
7. **Count the pills.** Every dose taken comes off the count. At 10 every morning, medicines with a week or less left get a refill text to the first contact naming the pharmacy.
8. **Sum up the week.** Every Sunday the family gets one email with how many doses were taken, what was missed or skipped and why, reading averages, and notes for the doctor in Mom's own words.

## Pages

| Page | What it does |
|---|---|
| Today | How each parent is doing right now, this week's pillbox filling in as replies come back, what needs the family, everything that happened today and the medicines running low |
| Pillbox | The pillbox for any of the last four weeks, a 30-day grid of every dose, adherence per medicine and every missed or skipped dose with what was said at the time |
| Medicines | Each medicine with its pill, schedule, days left, pharmacy and refill status. Update the count, start a refill or mark one picked up |
| Health log | Blood pressure, blood sugar and weight charts against the family's limits, notes worth telling the doctor and a printable summary for the next visit |
| Family circle | Who hears what and when, the alert ladder, two weeks of alerts with response times, and this week's Sunday email |
| Messages | Every text with Mom, Dad and the family, what each reply was read as, and pausing automatic replies |
| Live demo | Be Mom and Ana at once. Seven stories: takes them, goes quiet, skips one, sends a reading, running low, feels unwell or type your own |
| Settings | Pill times, the alert ladder, quiet hours, reading limits, message wording, demo mode and reset |

Light and dark themes, and every page works on a phone.

## Two ways to run it

Requires Node 20 or newer. Run `npm install` first.

| Mode | Command | Data |
|---|---|---|
| Connected | `npm run dev`, then open http://localhost:5194 | Your n8n workflows. The **Dashboard API** workflow must be published. |
| Public demo | `npm run build:demo` | A demo household built in the browser (`src/demo/`). No n8n, Twilio or Claude calls. |

The public demo and the n8n workflows run the same code. `src/demo/engine.js` (time, reading replies and readings, describing pills) and `src/demo/care.js` (the dose ladder, replies, alerts, refills and the weekly email) are bundled into the n8n **Engine** workflow, so what you see in the demo is what the workflows do. In the demo, a keyword reader stands in for Claude.

### Connected mode

Create `.env.local` with your n8n webhook address:

```bash
VITE_API_BASE=https://your-workspace.app.n8n.cloud/webhook
```

The Dashboard API workflow provides:

- `GET /dc-api`: settings, people, family, medicines, doses, readings, alerts, refills and messages
- `POST /dc-action?action=start&scenario=...`: start a Live demo story
- `POST /dc-action?action=sms&phone=...&body=...`: text Dose Circle from a demo phone
- `POST /dc-action?action=mark|remind&dose=...`: mark a dose taken or send the reminder again
- `POST /dc-action?action=ack|resolve&alert=...`: say you're on it or mark an alert handled
- `POST /dc-action?action=refill&refill=...&status=ordered|picked`: move a refill along
- `POST /dc-action?action=supply|request-refill&med=...`: update a pill count or start a refill
- `POST /dc-action?action=send|read&thread=...`: text someone from the Dose Circle number or mark a thread read
- `POST /dc-action?action=schedule|pause&person=...`: move a pill time or pause automatic replies
- `POST /dc-action?action=member&member=...`: change who gets alerts and the Sunday email
- `POST /dc-action?action=settings&...`: save settings
- `POST /dc-action?action=reset`: rebuild the demo household (demo mode only)

Before real people use it, add Header Auth to the webhooks and send the same header from `src/lib/api.js`, then switch demo mode off in Settings.

## Deploying

Deploy to Vercel as a Vite project with **Root Directory** `dose-circle`, **Build Command** `npm run build:demo` and **Output Directory** `dist`. `vercel.json` sends every path to `index.html`, so routes like `/pillbox` work on refresh.

## Folder

- `src/pages`: one file per page
- `src/components`: the app shell (`Shell.jsx`), the pillbox (`Pillbox.jsx`), pill drawings (`Pill.jsx`), the demo phone, charts, the dose sheet and UI building blocks
- `src/state/CareProvider.jsx`: data loading, the Live demo and every action
- `src/state/UiProvider.jsx`: theme, menu and which parent is selected
- `src/lib/metrics.js`: today's doses, weeks, supplies, alerts and readings derived from the data
- `src/lib/api.js`: switches between the n8n webhooks and the in-browser demo
- `src/demo/`: the shared engine, the demo household and the Live demo stories
- `public/og.png`: the link preview image
- `n8n/`: the eight n8n workflows and how to set them up

## Not medical software

Dose Circle is a reminder and messaging tool for families. It does not diagnose, give medical advice or check readings clinically, and it is not a medical alert system. Anyone who might be having an emergency should call 911. If you use it with real people, get their consent, set reading limits with their doctor, and check the rules for health data and text messaging where you live.
