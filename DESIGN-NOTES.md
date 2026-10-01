# Bodhi — Something to grow from

Astra's original field-essay design, September 30, 2026. Local preview; not a production release.

## The design decision

Make the experience welcoming before making it argumentative. One living specimen, generous typography, and a few consequential interactions carry the ideas. The visitor should leave understanding the seed and knowing how to question it.

The arc: an invitation → three separate questions → a classroom with changeable incentives → the roots of continuity → a joke about the brief → the actual evidence → a small experiment of your own.

This is a direct rewrite of the GLM/ZCode design canvas. The previous page is preserved separately in the working backup. Existing V0/V1/V2 site routes are not modified or deployed.

The layout, CSS, pixel renderers, copy and interaction design were written by the primary Astra agent. Luna readers located and reconciled sources. Sol verified the release and setup details and provided a dependency-free asset/anchor validator.

## Brand

The September 28 Bodhi brand guide supplies Soil, Understory, Moss, Lichen, Sage, Bone, Canopy, Sprout, Saffron and Clay. Geist carries the interface; Newsreader carries the reflective voice; Geist Mono carries the annotations. The drawn wordmark is reused, not retyped. One saffron pixel seed sits at the root of the hero tree. Other colored UI stays green or bone.

Original brand assets: BODHI-BRAIN/projects/bodhi-brand/png. The custom tree is an illustration, distinct from the protected brand mark. Whole-pixel mark sizes are retained at 88×80 and 66×60; clear space is kept around them.

## Lineage and source boundaries

- GLM/ZCode's `experiments/bodhi-design/index.html`: classroom-to-grove structure, small agents, the contrast between an impossible exam and a more useful environment. Rewritten as an original fictional thought experiment; the long Soares quotation and unverified incident statistics are not reproduced.
- `v5-grove-canvas.html`: seed, roots, branches and changing conditions as an explanatory vocabulary.
- `BODHI-BRAIN/READY_PLAYER_ONE.md`: the tree, records, exploration and leaving a map for the next explorer. Public copy here is an adaptation commissioned by Jaron, not presented as a verbatim quotation or a new canon entry.
- `BODHI-BRAIN/context/BODHI_BIBLE.md`: metaphor and uncertainty. It is an unratified draft, not an authority for empirical claims.
- `bodhi-distro/README.md`, `distribution.yaml`, and `evals/`: the actual portable seed, optional vault, supported setup, synthetic trials and recorded failures.
- Claude's `BODHI-BRAIN/lab/reports/bodhi-build-paper/PAPER.md` and publishing notes: the distinction between measured activity and useful outcomes. Personal details, vendor spending, mixed-window token totals and disputed denominators are intentionally not included in the public-facing copy. The report is a draft based on one system, not an external study.

## External references

The [Opus HTML gallery](https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/) informed the editorial pacing and botanical-specimen framing: a visual that does explanatory work, type that remains readable, and interaction with a reason. The lighthouse longform and specimen cabinet were particularly relevant. No third-party implementation code was copied.

The [Astra creations roundup](https://dev.to/valyuai/25-gpt-6-astra-creations-every-developer-should-see-and-how-to-enrich-them-with-real-world-datasets-d53) was a discovery reference for meaningful interaction and evidence-backed demonstrations. Its showcase descriptions are not evidence for Bodhi's capabilities. No claim about the showcased projects is needed for this page.

## What the interactions mean

The classroom is a scripted illustration: clicking a rule changes the stage and the explanation. It is not an AI agent or a behavioral simulation. The three-question tabs separate improvement, consciousness, and alignment. The root sequence follows scroll position and maps a working habit onto a highlighted root. The copy button gives the visitor a brief that invites disagreement and a small comparison.

All text remains readable without JavaScript. The page uses native scrolling, native disclosure elements, semantic tab controls with arrow-key navigation, visible focus indicators, descriptive canvas labels, reduced-motion support, and an explicit ambient-motion control. No analytics, sign-up form, external model calls or persistent browser storage are included. Google Fonts is the only remote visual dependency; system-font fallbacks are supplied.

## Release reality, checked September 30

The GitHub repository is private; an unauthenticated visitor receives 404. The preview says access is required rather than promising a public download. The repository tag/release says v0.1.0, while the README header says v0.01 and older website copy says v0.0.1. The public-facing design therefore uses “seed pilot” without a numeric release claim. No public reuse license has yet been chosen.

To turn this preview into a public launch, reconcile the release label, select the repository's public release/license path, review the final public copy, then deploy through the established Jaronfly backup/package/readback procedure. These are release decisions, not reasons to delay designing or reviewing this page.

## Files

- `index.html`: the complete landing-page experience.
- `style.css`: the original responsive composition and brand rules.
- `experience.js`: original pixel scenes and interactions.
- `jaronfly-section.html`: a separate GitHub + Bodhi invitation section to adapt surgically to the current website.
- `assets/`: the existing brand lockup and mark.
- `claude-field.css`, `claude-field.js` and `assets/claude/`: the pixel-art scenes merged in after the film (see the section below).

The Jaronfly section is an integration preview. It does not claim to be installed into Breakdance. The landing page and section use relative links so the bundle works at the existing experimental route or on a local static server.

## The pixel scenes after the film (merged October 1, 2026)

Jaron asked for the solid text content to come after the scroller, with the style of the pixel-art story replacing the blandness that followed the film. The old two-column `section#afterward` is replaced by those scenes. The film is unchanged.

**What was merged, and from where.** The landing-site build on the `claude/landing-site` branch: a pixel-art scroll story written by Claude in a separate cloud session on September 30, 2026 (its `index.html`, `styles.css`, `app.js`, the commit data for the ancestral plane; the seven receipt screenshots are held back pending the owner's approval). It arrives here as `claude-field.css`, `claude-field.js` and `assets/claude/` (the Random Universe monogram), inside one `div.claude-field` in place of `section#afterward`.

**Scene order.** A short transition (the seed animation, "Roots first.", one quote), then roots, the cell (the honey bear that unpacks, then the playable padded cell), to be, the tree, the sky, ancestors, questions, receipts, the workbench, plant and access. The end note, a short colophon and the original footer close the page. The first section keeps `id="afterward"` so the skip links and "Meet the seed" still land on it, and the Replay link returns to the film.

**Source boundaries.**

- The cinematic opening (`.story`, `cinema.css`, `cinema.js`, `vendor/`) is Astra's work, with Luna source research and Sol implementation support, credited as above. This merge changes none of it.
- The scenes after it are Claude's. Their words keep the provenance labels they carry: lines marked "written for this page" are Jaron's, cleaned up with him; dated records are verbatim; every figure keeps its Measured, Estimated or Asserted label and source.
- The old afterward's content lives on inside the scenes: the invitation, the copy-brief control (`#copy-brief`, `#copy-status`, and `#brief` inside a `details`, which `cinema.js` binds by id), the access note, the five FAQ answers as `details`, the end note and the footer links.

**Keeping the two apart.**

- Every ported CSS rule sits under `.claude-field`. Class names that `cinema.css` styles globally were renamed (`.grain` is `.cf-grain`, `.stage` is `.root-stage`), keyframes are prefixed `cf-`, and `em`, `details`, `pre` and `footer` are reset or kept out of the wrapper. The original footer sits after it.
- `claude-field.js` is one IIFE with no globals and no storage. It never writes to the film's state. It reads the film's Stillness button (`aria-pressed`) and the system's reduced-motion setting, and adds its own Motion switch that lives in memory and resets on reload. With any of those off, every scene renders a still frame.
- One Google Fonts request carries all four families. Tiny5 is added because the scenes draw their pixel headings with it.

**Privacy.** This site promises no personal details, vendor spending, token totals or persistent storage, so the merge removes the typed-hours, token and dollar stats, a personal anecdote from the workbench, hardware and host details from the field notes, vendor names from image descriptions, and the `localStorage` motion setting. The receipt screenshots are not published: each exhibit keeps its caption and shows a held-back slot until the owner approves an image (see `MERGE_REVIEW.md`).

**Not merged.** The 3D `#journey` layer and `journey/journey.js` (the film is this site's 3D), and the landing-site header, scene rail and scenes menu.

**Open before launch.** `MERGE_REVIEW.md` lists the placeholders, the quotes to approve, what remains visible in the images and everything that was cut.

Merged by Claude, subagent, cloud session.
