## Server deployment and synchronization

Production is `https://maratik.fun/cvwide/`, on the Worksquad SSH host. Its password and login screen match 26lockinnotes. Opening or refreshing the workspace shows the password screen again. All APIs, CVs, reports, source snapshots and transcripts require authentication. The app binds to loopback only.

The production service is Docker Compose project `cvwide`, Node.js 22, port `127.0.0.1:4312`. Root: `/srv/worksquad/projects/cvwide`; tested GitHub `main` commits become immutable `releases/<sha>`, selected by `current`. Persistent state is in `data/`; private assets are combined with tracked fonts/icons/CSS into each immutable release; seed comes from the synchronized workspace. Credentials stay in root-readable `secrets/app.env` and the existing server account's Codex storage. No credentials are copied into Git or the browser.

On this Mac, `npm start` uses `.local/remote.json` to open an SSH connection and serve `http://localhost:4311/cvwide/`. A LaunchAgent keeps that connection available after login and reconnects after network failure. It never falls back to a separate writable local database. Without `.local/remote.json`, development still runs the standalone local server.

Mutagen sessions `cvwide-code` (Mac → server workspace) and `cvwide-data` (server data → Mac data) run continuously. Code synchronization does not activate a production release; pushing code to GitHub main runs CI. Automatic deployment stays disabled until the dedicated, forced-command SSH key is explicitly authorized and `CVWIDE_DEPLOY_ENABLED=true` is configured. Both local and public interfaces edit the same server database through revision-checked APIs. The local `data/` directory is a mirror, not an offline editing interface; do not edit its JSON files or launch another writer against it. A mirror is not a versioned backup; existing atomic `.bak` files remain available. Check `mutagen sync list cvwide-code cvwide-data` and flush named sessions before relying on copied files.

Old conversations retain their messages and imported thread IDs, but start new server Codex threads on another message. Local Codex session storage and credentials are not migrated. New server conversations use the existing authenticated Codex binary with the existing read-only policy and default model.

CI uses synthetic fixtures and skips only the private Maratik-source provenance assertion. Local full tests retain that assertion. Deployment script `deploy/activate.sh` restores the previous release and routing if activation checks fail. For manual rollback, reactivate a prior tested main commit with the same script and its Git archive; state remains outside releases. Never use Mutagen to synchronize two live JSON writers.

# CV Wide

A private, local job-application workspace for Marat Gasanov. Includes the 11 ODS opportunities from the final Maratik job-search session, CVs in English and Russian, career history, portfolio references, prepared letters and submission evidence.

## Run

Requires Node.js 22 or newer. The dashboard has no npm dependencies. Chat additionally requires the Codex CLI installed and signed in (`codex login`).

```sh
npm start
```

Open http://localhost:4311. Use `PORT=4312 npm start` to choose another port. The server binds to `127.0.0.1` only; this app is intended for personal local use.

## Interface

The workspace uses locally bundled Inter Variable (Latin and Cyrillic), quiet neutral surfaces, a green context accent and consistent Lucide SVG icons. **Career copilot** is the Codex chat: a centered reading column, bottom composer, three task starters for empty conversations and an explicit connected-workspace indicator. Conversation history becomes a horizontal rail on smaller screens; it remains available alongside New conversation. Applications retains search, independent collection/status filters, score sorting, table/board switching and the full source/assessment detail dialog. Assets and profile use the same visual system.

Use the moon/sun button beside your profile (top right on mobile) to switch light/dark appearance. This preference is stored in browser localStorage only; it does not change tracking state or transcripts. Native controls, visible keyboard focus, a skip link, current-page navigation labels and reduced-motion support are included. Inter and Lucide assets and their licenses are bundled in public/assets; no external font/icon services or npm UI dependencies are loaded.

Design references and verification: [`docs/ui-design.md`](docs/ui-design.md).

## Chat with Codex

The main page is now Codex chat. Type a message and press Enter or Send; Shift + Enter inserts a new line. The first message starts a real Codex session. Follow-ups resume that exact session. New conversation starts a separate session; previous conversations remain available in the history list. Stop reply cancels the current turn. Replies and activity arrive over a live event stream (completed messages are displayed as Codex emits them, rather than simulated token typing).

Each new prompt also shows an expanded **process log**. Use **Hide process / Show process** to collapse or expand that turn independently; incoming updates preserve your choice for the current page session. The log shows workspace connection, session startup/resume, public progress messages, commands and outputs with exit codes, tool calls/results, search/plan events when emitted, runtime diagnostics, completion/errors, and token usage. It remains available with saved conversations after reload and restart. Existing transcripts without recorded activity remain unchanged; only new turns gain logs.

Activity is checkpointed once a second during a turn and saved at completion. Interrupted steps are marked after restart. Individual long output fields are clipped at 24,000 characters with an explicit marker; the output region scrolls. Private reasoning and encrypted model state are excluded. Event coverage follows the [official Codex JSONL interface](https://learn.chatgpt.com/docs/non-interactive-mode).

Every turn includes the complete latest workspace database: all application records, tracking notes and history, follow-up dates, prepared letters, bilingual career profile, contacts, assets and source provenance. Codex can also read project asset files. This is read-only assistance; edit application tracking in Applications. It does not submit applications or send messages to recruiters.

Chat uses the local `codex exec --json` / `codex exec resume` interface and your existing Codex authentication. Workspace data is sent to OpenAI for answers; local-only hosting does not mean offline inference. The CLI runs with a read-only sandbox, approvals disabled (operations requiring approval fail), and user configuration excluded to avoid inheriting unrelated hooks or integrations. It uses the CLI default model; set `CVWIDE_CODEX_MODEL` to explicitly select a model, or `CVWIDE_CODEX_BIN=/absolute/path/to/codex` if Codex is not on the server's PATH. No credentials reach the browser. Integration reference: [official OpenAI non-interactive Codex documentation](https://learn.chatgpt.com/docs/non-interactive-mode).

Conversations and Codex thread IDs are saved separately in `data/chat.json` (or the selected `CVWIDE_DATA_DIR`) with atomic writes and a previous `chat.json.bak`. Existing tracking data needs no migration. Export backup exports tracking state only; retain `chat.json` separately to back up conversations. Codex's own session files remain in its local account storage and are required to resume saved thread IDs. Interrupted turns are marked on restart; send another message to continue. Turns time out after ten minutes. Errors appear in the chat and preserve the typed draft when sending fails.

## Track applications

- Open a company row or board card to edit its status, notes and follow-up date.
- Save changes to persist them on disk. The same workspace is shared by browsers on this device.
- Follow-ups lists scheduled dates for open applications, highlighting dates due today or earlier.
- Search companies, roles, descriptions, contacts and notes; filter by application status or collection. Collection IDs are searchable and visible in rows and details. New roles start as Saved; grades, requirements, caveats and sources appear in details.
- Career assets contains both current CV PDFs, bilingual source JSON, the original application report and portfolio links.
- My profile contains experience, source-supported achievements, skills and education.
- Export backup downloads the complete workspace as JSON.

Updates are written atomically to `data/state.json`, retaining the previous state as `data/state.json.bak`. Each edit includes the current revision; conflicting edits from another tab are rejected rather than overwritten. Reload the page to get the latest state after a conflict. `CVWIDE_DATA_DIR=/absolute/path npm start` moves writable state to another directory.

To restore a backup, stop the server, retain a copy of the current `data/state.json`, place the exported JSON at `data/state.json`, then restart. There is no cloud sync, inbox integration or automatic submission. Follow-up dates are a planning list, not scheduled notifications. Collections can be imported through the local API; there is no upload form yet.

## Collection imports

`POST /api/collections/import` takes JSON `{revision, collection, jobs}`. Use the current revision from `/api/state`. A collection requires unique readable `id` (lowercase letters, numbers, underscores/hyphens), `label`, `source` and `collectedAt` (ISO date or timestamp); optional `sourceUrl` and `note` preserve provenance. Example IDs: `linkedin-2026-10-10-012503`, `telegram-2026-10-11-143000`. Record exact collection time only when known. Different simultaneous collections get different IDs even on the same day.

Each job requires string fields `company`, `role`, `url`, `description`, `fit`, `location`, `salary`, `channel`, `contact`. Optional `research` contains numerical 0–10 `preference_grade`, `technical_fit_grade`, `seniority_fit_grade` and nonempty `sources` with HTTP(S) URLs. New roles are Saved; caller-supplied tracking fields are ignored. Identical source URLs, ignoring query/fragment and trailing slash, link an existing role to the new group without replacing notes, status, history, follow-up or research. Different posting URLs remain distinct pending explicit review. Reusing a collection ID is rejected.

Schema 2 adds `collections` and per-job `collectionIds`. Schema-1 records receive the historical `ods-maratik-2026-10-07` group in memory; existing tracking fields and revision are preserved. The next successful mutation saves schema 2 with an atomic backup of the prior in-memory state. Imports share the serialized revision-checked write queue with tracking edits. Exports include groups; seed regeneration never overwrites saved tracking state.

## Vacancy scores

All 61 existing opportunities are assessed with **cv-fit-v1**, documented in [`docs/job-scoring.md`](docs/job-scoring.md) and available from the **Система оценки** button. Weights: technical tasks 35%, seniority/requirements 25%, comparable production delivery 20%, work format/location 10%, source clarity 10%. Every criterion has a score and explanation; the server computes the weighted 0–10 total, rounded once to one decimal. The dedicated **ОЦЕНКА / 10** column sorts highest first by default; click a score for the breakdown and uncertainties. Collection and status filters remain independent.

Scores use the saved job descriptions and current CV; availability was not freshly rechecked. Unknown substantive criteria are neutral rather than zero. Salary is excluded because periods, taxes and preferences are not comparable across records. Historical free-form research grades remain source snapshots and do not supply the shared total. The grading audit is in `output/job-assessments/2026-10-10/`, including frozen input, all criterion explanations, summary and verification.

`POST /api/assessments` takes `{revision, assessments: [{jobId, assessment}]}`. The optional per-job `assessment` in collection imports uses the same validator. An assessment requires version `cv-fit-v1`, five keyed `criteria` with 0–10 half-point `score` and nonempty `reason`, ISO `evaluatedAt`, `basis`, `sourceRefs`, and `unknowns`. Supplied total is ignored. This is additive to schema 2: no seed changes or tracking migration. Updates share the serialized revision-checked persistence queue, preserve prior assessments in `assessmentHistory`, append a separate Assessment event and keep all statuses/notes/follow-up/submission evidence. Missing assessments display **Не оценена**, not an old score or zero. Future collections should use the documented rubric; changing weights requires a new version and coherent regrading.

## Prepared LinkedIn applications

Latest submission checkpoint: **33/50 confirmed received**, live revision 114. 12 exact postings unavailable; 4 incomplete forms; Mistral Backend blocked by its three-application limit; 0 uninspected. The worksquad Playwright continuation confirmed Hugging Face, Emerging Travel Group and WorldQuant by receipts; Kaspi.kz was subsequently confirmed submitted by the user (4/7 total). Kaspi transmitted materials are not independently verified. OWKIN was rejected as possible spam after CAPTCHA; Apple and Criteo are deferred by the user. [Seven-application results](output/job-applications/worksquad-seven-2026-10-10/status.md). Full receipts and preserved material hashes: `output/job-applications/linkedin-50-2026-10-10/submission-ledger.json`; current unresolved cases: `blocked-cases.json`. The previous static HTML and original preparation snapshots below are historical.

The user authorized applying to all 50 jobs in `linkedin-2026-10-10-012503`. The complete destination, role-specific experience highlights and letter plan is available at [the local review page](http://localhost:4311/assets/linkedin-50-application-plan.html). Source artifacts are in `output/job-applications/linkedin-50-2026-10-10/plan.json` and `plan.md`; `verification.json` records validation and current blockers. There are 49 English letters and one Russian letter (Kaspi). These are prepared materials, with **0 confirmed new submissions** at this checkpoint; all 50 tracking records remain Saved.

Candidate declarations: Russian citizenship, visa support required, open to relocation, English B2, no French, earliest possible start subject to arrangements. A published salary range takes priority: use its midpoint with the stated currency, period and tax basis. Without a range, use monthly net USD equivalent of RUB400,000 for CIS and Georgia; USD6,000 for Serbia and other countries. The user subsequently confirmed USD8,000 gross/month for mandatory gross fields (USD96,000/year for annual fields); do not derive gross from the earlier net figures. B2B and EST–PST readiness are confirmed. The plan retains the dated CBR conversion reference and exact current CV hashes.

Browser submission is blocked at this checkpoint: native Arc selection returns `cgWindowNotFound`; app inventory alone does not establish a controllable window. Gmail profile access also required reauthentication. Resume with a fresh UI observation after a visible Arc window becomes available. Before each send, verify the exact role and application destination; after sending, retain final confirmation and update tracking through the revision-checked API. Do not retry a potentially submitted form without checking its result.

## Research provenance

Telegram **@hrlunapark** was reviewed on 10 October 2026 with a 60-day cutoff (11 August). Five roles were imported as Saved into `telegram-hrlunapark-2026-10-10-112909`: Reelful Founding Engineer, Seamflow Applied AI Engineer, Recraft Senior ML Research Engineer, Resolution Research Engineer and Apollo Research Senior Backend Engineer. The last two are conditional matches with explicit requirement gaps. All five include cv-fit-v1 assessments and dated source text. Full snapshots, exclusions and verification are in `output/job-research/2026-10-10-hrlunapark/`. Public post presence does not confirm active recruitment; missing post 406 remains unknown. Verification: 16/16 tests, four JS syntax checks, all 61 prior records preserved, live state equals disk, atomic backup matches pre-import state. Dashboard/mobile visual inspection was not performed.

New job research is stored separately in [`output/job-research/2026-10-10-linkedin/top-50-review.md`](output/job-research/2026-10-10-linkedin/top-50-review.md): 50 distinct ranked roles with provisional CV-based grades, requirements, employer context, source links and unresolved conditions. `top-50.json` contains structured records. The original 15-role snapshot remains in `review.md` / `shortlist.json`; `page-1-cards.json` retains 25 observed result cards, and `manifest.json` contains artifact hashes. At the user’s request, all 50 were subsequently imported into the shared list as Saved under `linkedin-2026-10-10-012503`. These are not submissions. Earlier snapshot statements about untouched tracking describe the collection stage. Only the first personalized LinkedIn page was observed: 35 additions came from public postings, separately labeled. This is not a verified top 50 of the full personalized 99+ results. Indexed-only, incomplete descriptions and source conflicts are explicit.

Imported on **10 October 2026** from `../maratik`:

- `resume/content.json`: factual career profile in English and Russian.
- `assets/resume-en.pdf` and `assets/resume-ru.pdf`: current PDF copies, with byte sizes and SHA-256 in the seed manifest.
- `projects/{ozon,artlebedev,sberbank,worksquad}/index.html`: retained source snapshots and original portfolio links. Worksquad currently has a title-only case page; no achievements were invented for it.
- `output/job-applications/ods-2026-10-07.md`: exact 11 ODS URLs, conditions, fit considerations, contacts, letters and evidence.
- Final assistant messages in Codex session `01a1178a-1c1b-7e10-9afe-81d8efc4e9c3` corroborate **11/11 submitted** and the Saved Messages summary. The full session was read locally; it is not copied into this app.

The initial pipeline is **10 Applied, 1 Under review (KitIngen)**. The KitIngen reply is historical evidence from 7 October, not a freshly checked inbox. Beeline and Sobolev are user-confirmed earlier sends: their exact dates and channels remain unknown. GetTransfer received contact details, location and the RU PDF; its prepared letter was not transmitted because the form had no letter field. Salary net/gross is unspecified except where explicitly recorded. Vacancy availability and new replies have not been rechecked.

Current CVs were updated after the application session. They are assets for future use, not proof of the exact PDFs transmitted on 7 October. Career dates and qualifiers are retained from the source.

To refresh source snapshots, with the sibling Maratik directory available:

```sh
npm run import:maratik
```

This regenerates `public/data/seed.json` and source assets, **never `data/state.json`**. A running server loads the seed at startup only when no saved tracking state exists. Do not delete saved state to refresh career assets without retaining a backup; explicit state migration is required.

## Verify

```sh
npm test
node --check server.mjs
node --check public/app.js
node --check chat.mjs
```

Fourteen checks cover standardized score calculation, complete rationales, atomic assessment batches, conflicts, restart persistence, collection imports and HTML rendering, plus chat streams, exact thread resume, transcript restart persistence, cancellation, concurrent sends, CLI failures, invalid chat requests, disk-write failure recovery, and the exact 11 source URL mappings and current CV bytes, status/notes/follow-up persistence across restart, concurrent edit conflicts and backup retention, invalid input and origin/host rejection, and served UI/assets. Tests create isolated temporary state; they do not modify your actual tracking workspace. The source-import assertion requires the sibling `../maratik` project.

The redesigned Applications table and an existing chat were visually inspected in native Arc on desktop. Further browser actions stopped when Arc reported user activity. Final responsive corrections, mobile rendering, dark-mode rendering, the empty-chat welcome, board/detail/assets/profile visual checks and automated browser end-to-end checks remain unverified. Fourteen automated checks pass, including render smoke assertions for appearance, chat entry controls, prompt cards and tracking provenance. Responsive behavior is implemented in CSS.

## Files

`server.mjs` serves the app and tracking API. `chat.mjs` manages Codex sessions, streaming and transcript persistence. `public/app.js` renders chat and the four tracking views and detail dialog. `public/style.css` defines desktop/mobile layouts. `scripts/import_maratik.py` creates the reviewed seed and asset snapshots. `tests/server.test.mjs` contains tracking checks; `tests/chat.test.mjs` uses an isolated fake CLI for reproducible session and failure tests. Live verification also confirmed a real database-grounded reply and a follow-up using the same Codex thread. The redesigned desktop chat was visually inspected; mobile and dark-theme rendering remain unverified due to shared-browser activity.

Tracking data and transcripts are stored locally; AI chat sends workspace context to OpenAI. Source reports contain personal contact information: this is not a public static-site bundle or deployment-ready multi-user service.

Application writing preference (user confirmed 10 Oct): emphasize supported achievements and role-relevant strengths. Do not volunteer missing experience, credentials, languages or other disadvantages in free-text answers. Answer mandatory factual eligibility questions truthfully; never fabricate qualifications. Later material revisions belong in the submission ledger, leaving the original prepared plan as a historical snapshot.

## Telegram application batch — 10 October 2026

Russian role-specific messages and corrected application CV were confirmed sent to @heyyyanna (Reelful and Recraft), @a_nro (Seamflow), and @yourdivna (Resolution): four jobs, three recipients and three PDFs, recorded as Applied through revision-checked API updates. Apollo @skaterina_64 has an outgoing text at 15:36 with a clock; final send check and PDF remain pending after native window lookup failed with cgWindowNotFound. Keep Apollo Saved until confirmed and inspect history before retrying. Exact manifest, texts, CV hash and evidence: `output/job-applications/hrlunapark-2026-10-10/submission-ledger.json`; current summary: `status.md`. Live state equals disk at revision 89. No app/schema code changed; prior collection checks passed 16/16. Restart and dashboard/mobile checks were not rerun during active user tasks.

Telegram batch status update: user confirmed message sent to @skaterina_64; previous resumed UI also showed its check mark. All five @hrlunapark jobs are now Applied. Apollo PDF transmission remains unconfirmed. Revision-checked update verified live=disk and backup=pre-update state at revision 90. See batch status.md and submission-ledger.json.

## Full writing and routing reference — LinkedIn 50

[All 50 roles, routes and full prepared letters](http://localhost:4311/assets/linkedin-50-writing-and-routing.html), with a downloadable text copy. Source: `output/job-applications/linkedin-50-2026-10-10/all-50-writing-and-routing.txt`. Generated from the original plan and submission ledger at live revision 102; no tracking fields changed. Each role distinguishes prepared letter text, retained submission evidence, remaining steps and closed/limited cases. OWKIN/Hugging Face include full current draft answers; unresolved candidate facts remain unresolved. Confirmed roles explicitly require no duplicate application. Historical submitted answers are reproduced only where preserved, not reconstructed. Verified 50 unique entries, all 50 original letters included, 29 confirmed entries, and HTTP 200 for HTML/text. Visual inspection of the new reference is not completed because native input is failing.

Current migration checks: 17/17 full local tests; isolated CI skips only the private Maratik provenance assertion. Browser verification confirmed pixel-identical desktop/mobile login, successful authenticated dashboard/PDF access, password reset on refresh, and visible mobile chat controls. Real container Codex returned the expected 66-job count. Local SSH UI read revision 114 and accepted a no-op write without changing tracking. Current data mirror equals the server; no scheduled backup service was added.
