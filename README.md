# ZeepalmLabs Automation Tools

Automations built by Zeepalm Labs with n8n and AI. Each folder is a self-contained project with its own README, code and demo.

## Automations

| Automation | What it does | Built with | Live demo |
|---|---|---|---|
| [Gym Churn Radar](gym-churn-radar) | Spots gym members who are drifting away, has Claude write each one a personal win-back email, and tracks who walks back in. 7 n8n workflows plus a React dashboard. | n8n, Claude, Gmail, React | [gym-churn-radar.vercel.app](https://gym-churn-radar.vercel.app) |
| [Missed Call Text-Back](missed-call-text-back) | Texts back every caller nobody could answer within seconds, lets Claude work out the job and book it, and alerts the owner only for emergencies and call-back requests. 7 n8n workflows plus a React dashboard. | n8n, Twilio, Claude, React | [zeepalm-missed-call-text-back.vercel.app](https://zeepalm-missed-call-text-back.vercel.app) |
| [No-Show Shield](no-show-shield) | Cuts clinic no-shows: reminders patients answer in their own words, a risk-ranked call list for the front desk, and a waitlist that refills cancelled times in minutes. Health concerns always go to a person. 8 n8n workflows plus a React dashboard. | n8n, Twilio, Claude, React | [zeepalm-no-show-shield.vercel.app](https://zeepalm-no-show-shield.vercel.app) |
| [Dose Circle](dose-circle) | Medicine check-ins by text for an older parent living alone. They answer in their own words, and the family is texted only when a dose goes quiet, a reading looks off, a refill is due or something sounds urgent. Never gives medical advice. 8 n8n workflows plus a React dashboard. | n8n, Twilio, Claude, React | [zeepalm-dose-circle.vercel.app](https://zeepalm-dose-circle.vercel.app) |

## Adding an automation

1. Create a folder at the root, named in lowercase with dashes (for example `lead-follow-up`).
2. Give it a `README.md` that says what it does, how to run it and how to deploy it.
3. Add a row to the table above.

## License

[MIT](LICENSE). Every automation in this repo can be used, changed and shared freely.
