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

The Jaronfly section is an integration preview. It does not claim to be installed into Breakdance. The landing page and section use relative links so the bundle works at the existing experimental route or on a local static server.
