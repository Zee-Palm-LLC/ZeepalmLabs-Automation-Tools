# Gym Churn Radar

A retention dashboard for gyms. It shows which members are about to cancel, has Claude write each of them a personal win-back email, and tracks who walks back through the door.

- **Live demo:** [gym-churn-radar.vercel.app](https://gym-churn-radar.vercel.app). It runs entirely in your browser with a sample gym, so nothing is sent.
- **Explainer video:** [media/Gym-Churn-Radar-Explainer.mp4](media/Gym-Churn-Radar-Explainer.mp4), 77 seconds.

## How it works

1. **Score every member.** Each check-in feeds a 0 to 100 risk score based on the member's own habits: days since the last visit, the drop against their usual rhythm, gaps longer than usual, and new members who never built a habit.
2. **Show the reasons.** Every score comes with plain-language reasons, such as "No visit in 20 days" or "Visits down 60%".
3. **Write and send.** Every morning, Claude writes a personal win-back email for each high-risk member and Gmail sends it, with a daily cap and a cooldown per member.
4. **Track who comes back.** The dashboard records who returned after an email, the win-back rate and the monthly revenue won back.

The React app in this folder is the front end. The engine is a set of n8n workflows (daily scan, weekly report, data import, settings form and dashboard API) that store data in n8n Data Tables and call Claude through n8n AI credits. The workflows are in [`n8n/`](n8n), with a step-by-step setup guide.

## Pages

| Page | What it does |
|---|---|
| Overview | Revenue won back, revenue at risk, win-back rate, visits this week, the risk radar, who is slipping away, check-in trend and the latest win-back emails |
| Radar | The attendance board: eight weeks of visits per member, with the day each win-back email went out and the visits that followed |
| Members | Search, filter by status and sort every member; open a member to check them in, freeze, reactivate or cancel |
| Win-backs | Every email Claude wrote, with its outcome, and the win-back funnel |
| Check-ins | Daily check-ins, who is in today, manual check-in, CSV upload and the door scanner webhook |
| Settings | Gym details, win-back offer, risk thresholds and email limits |

## Two ways to run it

Requires Node 20 or newer. Run `npm install` first.

| Mode | Command | Data |
|---|---|---|
| Connected | `npm run dev`, then open http://localhost:5190 | The n8n workflows. The **Dashboard API** workflow must be published. |
| Public demo | `npm run build:demo` | A sample gym in the browser (`src/demo/`). No n8n, Claude or Gmail calls. |

`npm run build:demo` also draws the link preview image (`public/og.png`) with `scripts/og.mjs`.

## Connected mode

The app talks to the n8n webhooks at `https://shameelirtaza.app.n8n.cloud/webhook` by default. To use another n8n workspace, create `.env.local`:

```bash
VITE_API_BASE=https://your-workspace.app.n8n.cloud/webhook
```

The Dashboard API workflow provides:

- `GET /gym-churn-api`: members, risk scores, win-back emails, stats, trend and settings
- `POST /gym-churn-action?action=scan`: run the churn scan now
- `POST /gym-churn-action?action=reset`: rebuild the demo gym (demo mode only)
- `POST /gym-churn-action?action=checkin&member=ID`: record a check-in
- `POST /gym-churn-action?action=status&member=ID&status=active|frozen|cancelled`: change membership status
- `POST /gym-churn-action?action=settings&...`: save settings

Before importing a real gym, add Header Auth to the n8n webhooks and send the same header from `src/lib/api.js`. Turn demo mode off only when members should receive emails.

## Deploying

Deploy to Vercel as a Vite project with **Root Directory** `gym-churn-radar`, **Build Command** `npm run build:demo` and **Output Directory** `dist`. `vercel.json` rewrites every path to `index.html`, so routes like `/members` work on refresh.

## Folder

- `src/pages`: one file per page
- `src/components`: the radar scope, attendance pulse, risk plates, barbell chart, trend chart, member drawer and other building blocks
- `src/state/GymProvider.jsx`: data loading, polling during scans and every action
- `src/lib/api.js`: switches between the n8n webhooks and the in-browser demo
- `src/demo/`: the demo gym and the in-browser backend used by the public site
- `scripts/og.mjs`: draws the link preview image at build time
- `n8n/`: the seven n8n workflows and how to set them up
- `media/`: the explainer video
