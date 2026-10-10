# CV Wide working instructions

This is a local personal job-search workspace. Read README.md for startup, data paths and source provenance. Keep changes focused and preserve user tracking data.

- Never infer submission, delivery, interview, offer or rejection from a draft, attachment or an older partial session. Import final source evidence; retain historical/user-confirmed/unknown distinctions and exact source URLs.
- Current career assets may postdate an application. Keep current PDF versions separate from historical transmitted materials; preserve hashes, qualifiers and unresolved career dates.
- Source imports must never overwrite saved state. Changes to the state schema or seed require an explicit migration strategy preserving notes, statuses, history and follow-up dates.
- Keep the server loopback-only. Do not publish personal reports, CV data or tracking state without explicit user authorization.
- All persisted mutations must validate fields, check the current revision, serialize writes and retain an atomic backup. Test restart persistence and conflicting writes in isolated temporary data directories.
- Test custom Host behavior through node:http: fetch may replace Host, giving a misleading assertion result.
- Use source-supported facts and preserve the original language of letters and evidence. Do not invent contacts, exact application dates, experience or salary tax treatment.
- Verify substantive changes with npm test and JS syntax checks. Inspect rendered UI when possible; report browser/mobile verification gaps explicitly. If the user is actively navigating a shared native browser, stop sending UI actions and avoid acting on stale accessibility indices.
- After substantial work, update this file with the smallest reusable correction and update README.md/HANDOFF.md for changed behavior and validation.
- For new job research, keep collected opportunities separate from tracking state until explicitly imported. Preserve card location/title versus employer-page variants, exact or unresolved posting IDs, direct-fetch failures and relative posting dates; never silently merge reposts or treat a remote label as country eligibility. Label grades as CV-based judgment rather than hiring probability.
- If browser navigation is blocked or conflicts with user activity, label public-search additions separately from observed personalized results. Do not describe a numbered shortlist as exhaustive coverage; track distinct roles and evidence confidence, and preserve prior snapshots when expanding scope.

- Codex chat must pass the latest in-memory tracking state on every turn and resume only the thread ID belonging to the selected conversation. Keep transcripts separate from tracking state; never imply that read-only replies saved tracking changes or transmitted applications.
- Validate chat persistence failures in temporary directories: a failed create, send or stop must restore the prior live session and revision, leaving retry possible. Save thread IDs as soon as they arrive; recover running and stopping turns as interrupted after restart.

- Treat simultaneous job collections as provenance metadata in the shared list: stable ID, source, known date/time and per-job memberships. Import new opportunities as Saved; link exact-source duplicates without overwriting tracking fields. Preserve raw snapshots and test additive migrations, duplicate membership and restart persistence before live import.
- Use docs/job-scoring.md and public/data/scoring-rubric.json for vacancy assessments. Store all five criterion scores with reasons, uncertainty and sources; compute totals through the server validator. Preserve historical grades and assessments, and never substitute a legacy free-form grade for a missing standardized score. Regrading must preserve tracking fields and pass formula, atomic-batch, conflict and restart checks.

- Responsive chat must retain New conversation and history at every breakpoint. Size chat from the actual remaining viewport with a scrollable message region; avoid fixed minimum heights that push the composer off small screens. Keep a page heading on the chat route and update DOM test mocks when introducing standard document APIs.

- Keep UI fonts and icon assets bundled locally with upstream licenses. Use the shared SVG sprite for interface marks rather than Unicode glyphs; retain text/ARIA labels for icon-only actions and verify Cyrillic coverage when replacing the typeface.

- Process logs must contain public execution events only, with escaped tool output and explicit clipping markers. Associate logs with stable user-message IDs; preserve collapsed state across live redraws and checkpoint partial activity. When rolling back a failed Stop, restore scalar statuses in place so the running turn retains its object identity. Test partial-output restart recovery with a turn lasting longer than the checkpoint interval.

- For application batches, validate the full destination/letter manifest against live job IDs and current CV hashes before sending. A running native app in inventory is not proof of an actionable window; record window-selection failures separately from user-input conflicts and resume from a fresh observation. Retain prepared, attempted and confirmed-submitted distinctions.

- Read employer application limits before sending multiple roles, and prioritize within those limits. Verify masked telephone fields after entry; do not treat input success as a correct value. Resolve contradictory credential dates before further CV transmission, retaining exact historical CV versions for already-confirmed sends.

- After selecting an application attachment, verify the completed upload after asynchronous processing; a chooser selection or transient filename alone is not delivery evidence. Preserve attachment uncertainty when a custom widget confirms only form receipt. Read dropdown options before choosing; verify final selected answers rather than assuming option order.

- Native AX clicks can focus a control without triggering its action. When a form or link remains unchanged, verify the visible result and use fresh screenshot coordinates; never count focus or a successful tool return as selection or submission.
- Easy Apply can import stale profile dates independently of the uploaded CV. Verify application-specific work and education dates before submission; omit unresolved fields rather than preserving contradicted autofill. Keep employer-linked current posting IDs separate from closed LinkedIn originals.
- For Telegram collections, retain ISO posting dates and an explicit freshness cutoff. Check full embedded messages when channel previews are truncated; quoted old roles are not reopened unless the fresh text explicitly says so. Keep missing/deleted message IDs unknown and distinguish a visible post from confirmed active recruitment.

- Searchable application dropdowns load asynchronously: wait for actual result labels, select the intended result, then verify the committed value. Enter on an unresolved search can submit the form; country selection does not automatically correct the telephone prefix.

- When rechecking unavailable roles, verify indexed alternatives on the live employer page or job board. Retain alternate posting IDs and dated recheck evidence separately from the original closure; never substitute a different role merely because its company and keywords match.

- Standalone reports served by this app must use same-origin stylesheet assets; inline styles are blocked by the existing Content Security Policy. Verify a rendered report, not only HTTP 200.

- For native Telegram sends, verify the final check mark separately for text and each PDF. An outgoing bubble with a clock is attempted, not confirmed; if window lookup fails during a chooser, preserve that stage and inspect history before any resend. Keyboard switcher search must be checked against the exact recruiter identity before pasting.

- Full application-writing exports must label original prepared letters separately from recorded transmitted answers, prefer ledger-verified destinations over historical proposed routes, and mark confirmed applications as requiring no duplicate send. Do not reconstruct missing final form text as evidence.

- Verify employer-specific saved cover letters when resuming Easy Apply; drafts can retain text for another employer. Sponsorship answers must be confirmed for the application country rather than inferred from an unrelated foreign permit. If the exact confirmed specialty is absent from a dropdown, a truthful Other selection with the specialty in free text is sufficient; preserve unknown dates.

- Production and the local SSH interface must use one writable database. Never synchronize two live state/chat JSON writers; keep Mutagen code and server-to-local data sessions separate and forbid standalone writes to the local mirror. Exclude personal seed/assets, transcripts and credentials from Git and container layers; use synthetic CI fixtures while retaining a separate full local provenance check.
- Public deployment must protect every data/asset/API route, preserve the `/cvwide/` prefix in reports and assets, and restore both service and routing after any post-activation failure. Include newly used timer/document APIs in UI test mocks and verify the password screen and real Codex invocation in the deployed runtime.
- Resolve and test the actual authenticated Codex binary in its runtime; PATH can select an older CLI than the standalone installation. Slim runtime images need a system CA bundle. During first deployment, an absent current symlink is not a prior release; verify the target exists and poll public routes after Nginx reload. Anchor root-only data ignore rules so public/data assets remain synchronized.
