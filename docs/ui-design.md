# UI design — 10 October 2026

The intended experience is a focused personal career workbench: a quiet assistant surface with tracking and career evidence always close by. This is an implementation in the existing application, with the existing local API and state contracts preserved.

## References and interpretation

- [ChatGPT Projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt): shared project context and conversations. Applied as visible connected context and nearby history.
- [Claude Projects](https://support.anthropic.com/en/articles/9519177-how-can-i-create-and-manage-projects): project knowledge. Applied as a compact summary of the CVs and opportunity evidence the assistant receives.
- [Perplexity Spaces](https://hub-prod.perplexity.ai/hub/faq/what-are-spaces): ongoing context and organized conversations. Applied as a dedicated workspace, without adding unsupported research or sharing features.
- [Linear UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh): consistent headers, controls and quieter navigation. Applied as a single typography, spacing, icon and surface system across chat and tracking.

These are design interpretations of official product guidance, not a pixel clone or an exhaustive comparison of current authenticated interfaces. Research by a Luna subagent; no personal data submitted to external design services.

## Design decisions

Locally bundled Inter Variable typography, Lucide SVG icons, neutral surfaces and one restrained green accent. The composer anchors chat; assistant text has a bounded reading width. Task cards insert draft prompts instead of sending automatically. Chat context and the OpenAI disclosure remain visible. New conversation and saved threads remain reachable on all screen widths. The message region scrolls independently so the composer fits the remaining viewport.

Opportunity status, collection provenance, assessment version and source-supported detail remain distinct. Color is supplementary; text labels remain visible. Theme switching changes appearance only and stores its preference in browser localStorage. Application and chat state remain unchanged.

## Verification and limitations

- npm test: 14/14 passed. JS syntax checks for app, server and chat passed.
- Existing UI smoke test covers collection filtering/provenance, score ordering/detail, theme labels, chat H1/controls, three welcome prompt cards, escaped message formatting and unchanged state revision.
- Native Arc desktop screenshots inspected: Applications table and existing conversation. Browser activity interrupted further visual work, so all subsequent UI actions stopped.
- Unverified: final responsive fixes on a rendered page, mobile and dark rendering, empty-chat welcome, board/detail/assets/profile rendering, keyboard walkthrough, and automated browser E2E. No new AI messages were sent for visual checking.
- Tracking and transcript hashes match the pre-edit snapshots; server/API/data schema and seed untouched. No external fonts, new packages or deployment.

## Typography and icon refinement

Inter Variable is bundled locally with its OFL license; regular text uses automatic optical sizing, headings have a clearer size/weight hierarchy, and small UI labels were increased. Latin and Cyrillic glyphs and the weight/optical-size axes were verified with fontTools in an ephemeral tooling environment (no project dependencies added). Source: https://github.com/rsms/inter.

The 23-symbol local Lucide sprite replaces Unicode arrows, clocks, stars and close marks in navigation, metrics, actions and chat. Shared CSS controls stroke weight and optical dimensions; decorative SVGs are aria-hidden and focusable=false. Source: https://lucide.dev/guide/; ISC license retained beside the sprite. Sprite XML and literal icon references were validated.

Validation: npm test 14/14 and app/server/chat syntax checks passed. Visual desktop/mobile verification of this refinement was not performed because shared-browser activity interrupted the earlier inspection.
