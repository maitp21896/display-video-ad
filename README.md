# TM Case Lab

Student worksheet and public trainer dashboard. No user login. All five original cases, wording and numbers are preserved. Google Sheets stores submissions; browsers communicate only with this website's API.

## Run locally

Requires Node.js 24. No third-party dependencies or installation step.

```sh
npm start
```

Student route: `/`. Trainer route: `/trainer`. API: `/api/submissions` (GET reads submissions; POST writes them). Open through the running server, not as a local HTML file. `npm test` runs backend and Apps Script contract checks. `npm run build` prepares the two public HTML pages for Vercel.

`GOOGLE_SCRIPT_URL` optionally overrides the default deployed Apps Script URL in `lib/sheets.js`. The URL is not a secret. The server validates TLS, follows Google's response redirect, and accepts a submission only after a matching acknowledgement. Browsers never connect directly to Google.

## Google Sheets receiver

Use `google-apps-script/Code.gs`. The existing deployed receiver already accepts submissions. To enable the standalone trainer page, its `doPost` also needs to recognize `{action: "list"}` and return `{ok: true, submissions: getTrainerSubmissions()}`. See `google-apps-script/README.md` for the small update.

The old Google-hosted Student/Trainer HTML files remain in `google-apps-script/` for reference; the standalone website serves root `index.html` and `trainer.html` instead. They are not included in the Vercel public output.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Use Framework Preset **Other**. `vercel.json` configures Build Command `npm run build`, Output Directory `public`, Node.js API and trainer route.
3. Optionally set Environment Variable `GOOGLE_SCRIPT_URL` if changing the Apps Script deployment.
4. Deploy. Students use the site's root URL; trainers use `/trainer` on the same domain.

Both pages are intentionally available without login. The trainer link displays student names and answers. Sheets can still be opened directly by its owner as requested.

## Data behavior

Only answered cases are required. Drafts and student names persist in the same browser. The pending submission ID persists across reloads and network failures; retrying unchanged answers reuses the ID, and Apps Script prevents duplicate rows. A new submission after successful confirmation receives a new ID. Each answered case is stored as one row.

## Verification / deployment state

Backend tests and browser integration checks pass locally. A real browser submission through the local website API was acknowledged by the live Google receiver using the original test ID (no additional row). The live trainer read endpoint remains unavailable until the small `doPost` update is deployed. No public Vercel deployment has been completed yet.
