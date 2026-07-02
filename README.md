# Signifly · Tech Radar

An interactive, [ThoughtWorks-inspired](https://www.thoughtworks.com/radar) technology
radar for the Signifly dev team. It shows what we're **adopting**, **trialing**,
**assessing** and **holding** — and, more importantly, the reasoning behind each call.

**Live:** https://tech-radar-one.vercel.app · content is managed in DatoCMS.

Built lean: **Next.js 16 · React 19 · TypeScript · Zod · Tailwind v4**. The radar
visualisation and its animated background are **pure Canvas 2D** — no D3, no charting
library, no extra dependencies.

```bash
pnpm install
cp .env.local.example .env.local   # add your DATOCMS_API_TOKEN (see below)
pnpm dev                           # http://localhost:3000
pnpm build                         # dynamic SSR app, deployed on Vercel
```

## The model

A **blip** is one technology, tool or technique. Every blip has:

| field         | values                                                        |
| ------------- | ------------------------------------------------------------- |
| `quadrant`    | `languages-frameworks` · `platforms` · `tools` · `techniques` |
| `ring`        | `adopt` · `trial` · `assess` · `hold` (centre → edge)         |
| `movement`    | `new` · `in` · `out` · `none`                                 |
| `description` | short rationale — the *why*, the learning                     |
| `tags`        | optional, for filtering/search later                          |

- **Rings** encode confidence. The closer to the centre, the more we reach for it by default.
- **Quadrants** group by kind. Each has an accent colour used consistently across the UI.
- **Movement** is drawn on the blip (a triangle = new; chevrons = moved in/out).

Everything human-facing (labels, colours, ring blurbs, geometry) lives in
[`lib/radar.ts`](lib/radar.ts). Data only ever references the stable slugs, so you can
rename or recolour a quadrant without migrating content.

## Content — managed in DatoCMS

The radar reads its blips **live from DatoCMS** on every request. The single boundary
between the UI and the data is [`lib/content.ts`](lib/content.ts).

- **Model:** `radar_blip` (GraphQL `allRadarBlips`), with fields `name`, `slug`,
  `quadrant`, `ring`, `movement`, `description`, `tags`. `slug` maps to the blip's `id`.
- **Rendering:** the page is **fully dynamic** — `export const dynamic = "force-dynamic"`
  in [`app/page.tsx`](app/page.tsx) and `cache: "no-store"` on the fetch. Publish a change
  in DatoCMS and it appears on the next page load; nothing to rebuild.
- **Fallback:** if `DATOCMS_API_TOKEN` is unset, or the CMS is unreachable, `getBlips()`
  transparently falls back to the typed seed in [`content/blips.ts`](content/blips.ts),
  so local dev and previews never render an empty radar. Everything is validated against
  the Zod schema in [`lib/schema.ts`](lib/schema.ts), so bad data fails fast.

### Editing content

Add or move a blip in DatoCMS and **publish** — that's it. Positions are derived
deterministically from the `slug`, so blips never jump around between renders.

### Environment

```bash
DATOCMS_API_TOKEN=…        # DatoCMS read API token (kept in .env.local, gitignored)
DATOCMS_DRAFT=true         # optional: include draft (unpublished) blips in previews
```

On Vercel the token is set for Production, Preview and Development.

> **Performance note:** fully dynamic means every visit makes a live CMS call. For a
> small internal tool that's fine. To get fresh-but-cached later, switch to tag-based
> caching + a DatoCMS publish webhook that hits a revalidate route.

## How the radar is drawn

- [`components/RadarCanvas.tsx`](components/RadarCanvas.tsx) — the radar: ring circles,
  quadrant axes, an animated **sweep**, round blips, hit-testing, hover/click, and an
  eased **zoom camera** (click a quadrant to fly into it, click a blip to zoom to it,
  Esc to pull back). Respects `prefers-reduced-motion`.
- [`components/MeshBackground.tsx`](components/MeshBackground.tsx) — the background: a
  pixel "landscape" that parallax-pans with inertia, gradient-masked to fade at the
  edges, and subtly reactive to cursor movement and clicks.
- [`components/RadarApp.tsx`](components/RadarApp.tsx) — the shell: floating brand
  lockup, quadrant/ring filters, the selected-blip detail, and a synced blip index
  (hovering the list highlights the radar and vice-versa).

## Suggested contribution flow (the "framework" part)

The visualisation is v1; the process around it is what keeps a radar honest:

1. **Propose** — draft a new/moved blip in DatoCMS (or open a PR editing the seed) with
   a one-paragraph rationale.
2. **Discuss** — the team reviews at a regular radar session; a blip only moves ring on
   rough consensus.
3. **Publish** — publish in DatoCMS and it's live immediately. Cut a dated "volume"
   periodically so movement stays meaningful over time.
