# ZeepalmLabs Automation Tools

Automations built by Zeepalm Labs with n8n and AI. Each folder is a self-contained project with its own README, code and demo.

## Automations

| Automation | What it does | Built with | Live demo |
|---|---|---|---|
| [Gym Churn Radar](gym-churn-radar) | Spots gym members who are drifting away, has Claude write each one a personal win-back email, and tracks who walks back in. 7 n8n workflows plus a React dashboard. | n8n, Claude, Gmail, React | [gym-churn-radar.vercel.app](https://gym-churn-radar.vercel.app) |
| [Missed Call Text-Back](missed-call-text-back) | Texts back every caller nobody could answer within seconds, lets Claude work out the job and book it, and alerts the owner only for emergencies and call-back requests. 7 n8n workflows plus a React dashboard. | n8n, Twilio, Claude, React | [zeepalm-missed-call-text-back.vercel.app](https://zeepalm-missed-call-text-back.vercel.app) |

## Adding an automation

1. Create a folder at the root, named in lowercase with dashes (for example `lead-follow-up`).
2. Give it a `README.md` that says what it does, how to run it and how to deploy it.
3. Add a row to the table above.
