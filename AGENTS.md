# Project working rules

- Do not add assistant, model, tool-brand, or generation-source attribution to user-facing or shareable material. This includes UI copy, documents, reports, filenames, branches, commits, and pull requests. Use neutral business names.
- Before continuing development in this repository, read `/Users/yitianwu/.config/development/pr-workflow.md` and keep the user's open work in one pull request. Preserve Git history and existing evidence.
- Public temporary mail remains available by address alone. The app does not automatically clear local history. Binary attachment caching is limited to 10 MiB per file and 100 MiB in total; browser storage pressure or clearing site data can remove local copies. Preserve the current permission and attachment boundaries.
- Treat the language registry as the single source for language selection, browser matching, page direction, server messages, and home-screen metadata. A language offered in the picker must have a validated application dictionary; do not present an English fallback as a completed translation.
- When changing mail details, images, or attachment access, verify personal mail, permission-protected All Mail, and public temporary mail separately. All Mail must use its own viewing permission for both inline images and attachment bytes, including retained deleted mail; personal and public access must retain their ownership and visibility checks. Verify both preview and completed download, and reject JSON business errors returned with HTTP 200 before treating a response as attachment bytes.
- Visible mail rows must have usable detail data or an explicit recoverable detail-loading state. Never silently turn failed full-content requests into empty messages. Discard obsolete list and preview results after mailbox/filter/session changes, tolerate unknown message states, isolate private mail across login sessions, and recover missing inline binaries in saved public mail when online. Run the mail-flow browser checks for shared mail changes; record simulated and production checks separately.
- Protect the D1 read budget whenever changing mail queries, filters, pagination, address lookup, or polling. `LIMIT`, a short time window, and local caching do not prove that a query reads few rows. Check the query plan against the production schema, verify required indexes were actually applied, and compare per-query and daily rows read before and after deployment. Keep background tabs from polling and back off on service errors. Never label a database or network failure as an invalid address. If D1 is over quota, report the production check as pending rather than claiming the issue is resolved.

## UI design specialists

Read the matching skill before work. A request may need more than one, in this order when the work spans the whole interface:

| Task | Skill |
| --- | --- |
| User journeys, navigation, screen states, information hierarchy | `.agents/skills/map-mail-experience/SKILL.md` |
| Visual direction, tokens, components, themes, responsive and right-to-left rules | `.agents/skills/shape-mail-design-system/SKILL.md` |
| Vue and Element Plus implementation | `.agents/skills/build-mail-interface/SKILL.md` |
| Independent UI acceptance and regression review | `.agents/skills/review-mail-interface/SKILL.md` |

Each specialist should produce the artifact or evidence described in its skill, and state what it did not verify. For whole-interface work, experience research and the current-state audit can run in parallel. Settle the screen and visual design before implementation, then have an independent reviewer check the rendered result. Keep file ownership explicit so parallel edits do not collide.

- Reply and forward must preserve inline images through controlled reads and durable compose content, forward ordinary attachments, and retain attachment changes in draft confirmation. Include recent-recipient isolation, keyboard search, compose controls, and editor Escape in the release checks.
- Image regression checks must include historical HTTPS remote images as well as embedded attachment images in personal, administrator, and public mail. Keep the frame policy shared; verify decoded images, not merely image elements, while preserving script, frame, form, and same-origin isolation.
