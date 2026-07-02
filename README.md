# Signifly · Tech Radar

An interactive, [ThoughtWorks-inspired](https://www.thoughtworks.com/radar) technology
radar for the Signifly dev team. It shows what we're **adopting**, **trialing**,
**assessing** and **holding** — and, more importantly, the reasoning behind each call.

Built lean: **Next.js 16 · React 19 · TypeScript · Zod · Tailwind v4**. The radar
visualisation is **pure Canvas 2D** — no D3, no charting library, no extra dependencies.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # static, deployable to Vercel
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
[`lib/radar.ts`](lib/radar.ts). Data files only ever reference the stable slugs, so
you can rename or recolour a quadrant without migrating content.

## Adding / editing blips

Today the source of truth is a typed seed file: [`content/blips.ts`](content/blips.ts).
Add an entry, and it appears on the radar (position is derived deterministically from
the `id`, so blips never jump around between renders). The list is validated by the Zod
schema in [`lib/schema.ts`](lib/schema.ts) on load, so a bad entry fails fast.

## Going live on DatoCMS

The one boundary between the UI and the data is [`lib/content.ts`](lib/content.ts).
It already contains a ready-to-use DatoCMS GraphQL fetch — it activates automatically
when `DATOCMS_API_TOKEN` is set, and falls back to the seed file if the CMS is
unreachable. Nothing downstream changes, because everything is typed against `Blip`.

1. In DatoCMS create a **Radar blip** model with fields: `name`, `slug`, `quadrant`
   (select), `ring` (select), `movement` (select), `description`, `tags`.
   The select values must match the slugs in the table above.
2. Set env vars:
   ```bash
   DATOCMS_API_TOKEN=…        # read-only API token
   DATOCMS_DRAFT=true         # optional: preview unpublished blips
   ```
3. Deploy. `getBlips()` now reads from Dato (revalidated every 5 min; wire a
   DatoCMS webhook → `revalidateTag`/redeploy later for instant updates).

## How the radar is drawn

- [`components/RadarCanvas.tsx`](components/RadarCanvas.tsx) — the canvas: ring bands,
  quadrant axes, an animated radar **sweep**, blips, glow, hit-testing and hover/click.
  Respects `prefers-reduced-motion` (renders a single static frame).
- [`components/RadarApp.tsx`](components/RadarApp.tsx) — the shell: header, quadrant/ring
  filters, the selected-blip detail card, and a synced blip index (hovering the list
  highlights the radar and vice-versa).

## Suggested contribution flow (the "framework" part)

The visualisation is v1; the process around it is what keeps a radar honest:

1. **Propose** — anyone opens a PR adding/moving a blip in `content/blips.ts`
   (or a draft in DatoCMS) with a one-paragraph rationale.
2. **Discuss** — the team reviews at a regular radar session; a blip only moves
   ring on rough consensus.
3. **Publish** — merge / publish. Cut a dated "volume" periodically so movement is
   meaningful over time.
