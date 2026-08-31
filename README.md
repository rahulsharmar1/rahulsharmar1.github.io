# Rahul Sharma — Portfolio

A dark-first portfolio for a backend software engineer, styled after Brittany
Chiang's site: **Inter** typography, a blue-slate/navy dark theme (`#0f172a`) with a
**teal** accent (`#5eead4`), a sticky two-column layout, and a GitHub-powered
projects section.

## Highlights

- **Dark / light / system theme** with `localStorage` persistence and no flash of wrong theme.
- **Two-column sticky layout** on desktop, single-column on mobile with a full-screen menu.
- **Interactive 3D node network** — a pure-canvas rotating cloud of connected nodes
  (systems / APIs / infrastructure). No libraries, lazy-initialized when it scrolls
  into view, pauses off-screen, recolors with the theme, and renders a single static
  frame under `prefers-reduced-motion`.
- **GitHub-powered projects** — live from the GitHub REST API, cached in
  `localStorage` (6h TTL), with a committed local snapshot
  (`data/github-fallback.json`) as fallback when the API is rate-limited or offline.
- **Project detail modal** — overview, technical approach, per-language split,
  topics, and the repo's README (rendered by a small built-in Markdown parser).
- **Archive page** (`archive.html`) — every repo, with search and category filtering.
- **Accessibility** — skip link, focus-visible rings, keyboard-operable cards/modal,
  ARIA labels, reduced-motion support.
- **SEO / Open Graph** metadata + JSON-LD `Person` structured data.
- Scroll-spy active navigation, reveal-on-scroll, hover micro-interactions, copy-email.

## Structure

```
index.html                 Home (hero, about, experience, projects, stack, contact)
archive.html               Searchable / filterable full repo archive
css/styles.css             All styles + theming tokens
js/main.js                 Theme, nav, scroll-spy, reveals, 3D node network
js/github.js               GitHub fetch + cache + fallback, cards, modal, filtering
data/config.json           Hand-curated identity / experience / stack / project meta
data/github-fallback.json  Committed API snapshot (offline fallback)
assets/                    Résumé PDF + optional OG image go here
```

## Editing content

- **Text** (hero, about, experience, tech stack, contact) is authored directly in
  `index.html` for SEO and no-JS resilience.
- **Curated project blurbs / highlights / categories** live in `data/config.json`
  under `projectMeta`, and `featured` chooses which repos appear on the home page.
- **Everything else about a repo** (stars, languages, README) comes straight from
  GitHub — nothing is invented.

## Refresh the offline snapshot

`data/github-fallback.json` is a point-in-time copy. Regenerate it any time by
re-running the small script used to build it (hits the public GitHub API for
`rahulsharmar1`).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Push these files to the `rahulsharmar1.github.io` repository (root). GitHub Pages
serves it as-is — no build step.

## To do (yours)

- `assets/Rahul_Sharma_Resume.pdf` is already in place (the Résumé buttons link to it).
  Replace the file to update it.
- Optional: add `assets/og-image.png` and point the `og:image` tags at it.
- Optional: add real start/end dates to the Experience entries in `index.html`
  (currently labelled "Full-time" / "Internship" since exact dates weren't in the résumé).
