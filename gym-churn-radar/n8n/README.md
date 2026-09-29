# Gym Churn Radar: n8n workflows

These are the seven workflows behind Gym Churn Radar, exported from n8n. Credentials, workspace IDs and personal details have been removed, so they import cleanly into any n8n workspace.

| File | Workflow | Trigger | What it does |
|---|---|---|---|
| `0-demo-gym-generator.json` | Demo Gym Generator | Manual, or called by the Dashboard API | Clears the tables and creates a demo gym: 40 members, 90 days of visits and past win-back emails |
| `1-daily-churn-scan.json` | Daily Churn Scan | Every day at 7am, or called by the Dashboard API | Scores every active member 0 to 100 with reasons, has Claude write a win-back email for each high-risk member, sends it with Gmail, logs it and emails the owner an at-risk report |
| `2-monday-roi-report.json` | Monday ROI Report | Every Monday at 8am | Emails the owner revenue won back, revenue at risk, the win-back rate and three actions for the week written by Claude |
| `3-data-import.json` | Data Import | Form and webhook | A CSV upload form for members and check-in history from any gym software, plus a webhook for door scanners and booking apps |
| `4-settings-form.json` | Settings Form | Form | Lets the gym owner change gym name, email, sender name, offer, booking link and demo mode |
| `5-dashboard-api.json` | Dashboard API | Two webhooks | Serves data to the React dashboard and handles its actions: scan, reset, check-in, status and settings |
| `9-error-alert.json` | Error Alert | Error trigger | Emails the owner when any of the other workflows fails |

## Setup

### 1. Create the data tables

In n8n, open **Overview > Data tables** and create these four tables.

**churn_members**

| Column | Type |
|---|---|
| member_ref, name, email, phone, plan, status, trainer, risk_level, risk_reasons | string |
| monthly_fee, visits_30d, visits_prev_60d, risk_score, outreach_count | number |
| join_date, last_visit, scored_at, last_outreach_at | date |

**churn_checkins**

| Column | Type |
|---|---|
| member_ref, source | string |
| checked_in_at | date |

**churn_outreach**

| Column | Type |
|---|---|
| member_ref, name, email, risk_level, risk_reasons, subject, message, sent_to | string |
| risk_score, monthly_fee | number |
| sent_at | date |
| demo_mode | boolean |

**churn_settings** (one row)

| Column | Type | Example |
|---|---|---|
| gymName | string | IronPulse Fitness |
| ownerName | string | Sarah |
| ownerEmail | string | owner@your-gym.com |
| senderName | string | Sarah from IronPulse Fitness |
| winbackOffer | string | a free 30-minute session with one of our coaches |
| bookingLink | string | (optional) |
| currency | string | $ |
| claudeModel | string | claude-opus-5 |
| highRiskScore | number | 60 |
| mediumRiskScore | number | 35 |
| outreachCooldownDays | number | 14 |
| maxOutreachPerDay | number | 20 |
| maxOutreachPerMember | number | 3 |
| demoMode | boolean | true |

### 2. Import the workflows

Import the files in order (**Workflows > Import from file**), starting with `9-error-alert.json`, then `0` to `5`.

After importing, open each workflow and:

1. **Data Table nodes:** pick the matching table in every node that shows `SELECT_..._TABLE`.
2. **Gmail nodes:** connect a Gmail account.
3. **Claude nodes:** use n8n's built-in AI credits or add an Anthropic credential.
4. **Dashboard API only:** in **Run Daily Churn Scan** and **Rebuild Demo Gym**, pick workflows `1` and `0`.
5. **Workflow settings:** set **Error workflow** to *Gym Churn Radar 9 - Error Alert* in workflows `1`, `2`, `3` and `5`.

### 3. Try it safely

1. Run **Demo Gym Generator** once to fill the tables.
2. Keep `demoMode` set to `true`. Every win-back email then goes to `ownerEmail` instead of to members.
3. Publish **Dashboard API** and point the React app at your workspace with `VITE_API_BASE` (see the main README).

## Before using real member data

The webhooks and forms are open so the demo works without logging in. Before importing a real gym:

- add Header Auth to the webhooks and send the same header from the dashboard;
- set `demoMode` to `false` only when members should receive the emails.
