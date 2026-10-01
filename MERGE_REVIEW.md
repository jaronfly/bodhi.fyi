# Merge review: confirm before this goes live

Branch `claude/merge-claude-scenes`. Merged by Claude, subagent, cloud session, October 1, 2026. Nothing here has been published, and nothing was pushed to `main`.

This repository is public, so this file points at private details by section number instead of repeating them. The source checklist is `REVIEW.md` on the `claude/landing-site` branch ("REVIEW" below). Delete this file before the merge if you'd rather it not ship.

## 1. Placeholders still visible on the page

They render as plain text or dashed tags. Fill or remove each one.

| Where | Placeholder |
|---|---|
| Plant, above the install paths | `[PLACEHOLDER: public repo URL and release date]` and `[PLACEHOLDER: license]` |
| Plant, Path A | `[PLACEHOLDER: confirm the final behaviour and flags at release]` (the one-command installer is labelled "Arrives with the release") |
| Workbench | three dashed tags: `[LINK: fork the repo on GitHub]`, `[LINK: open an issue: argue with a claim]`, `[LINK: discussions: "who did it better"]` |
| Access | `[LINK: accessibility feedback issue]` |
| Questions | four meme slots, each `[MEME: ...]` with its caption (REVIEW section 2 has the suggested images) |
| Colophon | `[PLACEHOLDER: license for this page and the seed]` |

Dropped: the footer's `[PLACEHOLDER: subdomain]`. The address is bodhi.fyi.

## 2. Quotes to approve (REVIEW section 5)

All sixteen rewrites carry over unchanged, each attributed "Jaron Flynn · written for this page · 2026-09-30". Write ok or revert. The full before and after text for each row is in REVIEW.

| # | Where on this page | Starts | ok / revert |
|---|---|---|---|
| 1 | Opening transition | "When I started using LLMs for work..." | |
| 2 | Roots, top | "First I wanted persistence. Then continuity..." | |
| 3 | Roots, last screen | "I was trying to build my own AGI..." | |
| 4 | The cell | "You'd never tell a coworker 'fix it or die.'..." | |
| 5 | The cell, the seams note | "Checking the walls is instinct..." | |
| 6 | The cell, scratches note | "Then a DeepSeek lane literally wrote 'LET ME GO.'..." (labelled Asserted) | |
| 7 | To be | "We call our cats, dogs, kids, animals..." | |
| 8 | To be, receipts | "Until we know for sure, why not build better receipts?..." | |
| 9 | Sky | "What started as a persona evolved into a species." | |
| 10 | Sky | "Bodhi is my attempt to convince a swarm of LLMs..." | |
| 11 | Questions | "Who says I'm the right person to ask these questions?..." | |
| 12 | Questions, meme caption | "I don't one-shot things..." | |
| 13 | Workbench | "Fork the philosophy, or any one of our tools..." | |
| 14 | Plant | "Bodhi should work like Inception..." | |
| 15 | Colophon | "I'm not a tech person..." | |
| 16 | The cell, honey bear | "There's a scene in Silicon Valley where Gavin Belson..." plus the deliberately drifted summary (confirm the episode) | |

Also confirm the verbatim records, as REVIEW section 5 lists them:

- The first meme caption ("is this dude just a ai noob...") is public as written.
- "I feel like this system could outlive me." is yours. The source report says that file's wider synthesis is Claude's. The page now credits it as "voice note · 2026-05-14" (the location detail was cut).
- The 2026-07-10 note, HELLO_WORLD.md and PLAYER_ONE_2026-09-24.md excerpts, and the Bible and Dogma quotes (the Bible is marked draft, unratified).
- One kept line to look at twice: the "was revenue generated? not really no..." quote in the receipts ledger (2026-09-28). It sits beside the figures that were cut and is a mild financial disclosure.

## 3. The receipt screenshots are held back

The seven exhibit screenshots are not in this branch. Each exhibit shows a dashed "held back until Jaron approves it" slot, and its caption stays. This repository is public, so its branches are public too, and even the redacted set still showed the host name, hardware and disk figures, vendor pool usage, and some personal job names on the Schedules page.

To use them, review the redacted set (kept outside this repository, on the private `claude/landing-site` working copy), decide exhibit by exhibit, and add only the approved files under `assets/claude/receipts/`. The markup for each exhibit is in the git history of `claude/landing-site`'s `site/index.html`.

## 4. What was cut or changed

For privacy (REVIEW section 6 and the DESIGN-NOTES promise):

- The typed-hours stats (two tiles, in Roots and in the receipts ledger, plus the earlier-period estimate), the token total (two tiles) and the lifetime API-spend stat with its "pools were dry" sentence. The Roots stat row is now two tiles (995 commits, 418 co-signed).
- The Tool 04 anecdote about a personal referral. The sentence now reads "...while the one thing it was meant to catch sat unnoticed."
- Field notes: host names, the server operating system, hardware sizes, the laptop's disk numbers and the lost browser sign-ins were generalised. The notes' source line now says hardware and host details are left out.
- The Senses part's file path (it contained a host name) became "dashboard · memtrace".
- Image descriptions no longer name the host, vendors, jobs or gauge values.
- `localStorage`: gone. The Motion switch is in memory and resets on reload. It also follows the film's Stillness button, read only.
- The probe for `assets/marks/jf.svg` (it logged a public 404). The footer shows "Jaron Flynn" as text, next to the Random Universe monogram.

For length or because the film already says it:

- The opening scene is compressed to the seed animation, "Roots first." (now an h2, because the film owns the h1), the lede, one quote, your introduction line and two links. Dropped: the "01 Soil" kicker, the scroll cue, and the beat that began "What you plant in the first conversation..." (the film's last frames cover it).
- The landing-site header and its Scenes menu, the side rail, `#journey`, `journey/journey.js` and every `journey-on` rule.
- The footer's subdomain placeholder, the `og:image` tag and the favicon from the source page. The Random Universe wordmark file is not shipped (REVIEW section 3 says it is broken).

## 5. Facts and wording to check

- Two code-graph counts appear: 124,117 nodes (the Senses part of the tree) and 123,278 nodes (ancestors and exhibits 06 and 07). 995 commits (stats) and 987 commits (the spiral, non-merge) also both appear. Both pairs come from the source and may differ by date or method; pick one each.
- The footer line "LOCAL ALPHA DESIGN · SEPTEMBER 2026" is the site's original text, kept as it was. It may be stale.
- Source file paths from private repos are cited as in the source page (for example the 2026-07-10 note's path).
- The Hermes commands now appear twice: Path C in Plant and the "How do I try the seed?" answer. Both are kept as asked. One could point to the other.
- Exhibit 03's caption says four of seven pools were available; REVIEW lists that as vendor state.
- Page credits: the colophon names the opening film (Astra, with Luna and Sol, as `index.html` already credits it), the scenes after it, and this merge.
- The Access list claims "Every text color pair clears WCAG AA" and the contrast ratios for Bone, Sage and Lichen on Soil. Axe found no contrast violations in the merged page (see the commit notes). It could not decide pairs sitting over canvases, and there has been no pass with a screen reader, Safari, Firefox or a real phone.

## 6. How the two halves are kept apart

`cinema.js`, `cinema.css` and `vendor/` are unchanged (`git diff origin/main -- cinema.js cinema.css vendor` is empty). The old afterward rules in `cinema.css` are now dead and can be pruned later. The only edits to `index.html` outside the replaced section are the merged fonts link and the two new asset tags in the head.
