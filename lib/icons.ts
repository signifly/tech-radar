/**
 * Default brand-logo mapping: blip `id` → Simple Icons slug.
 *
 * DatoCMS can override this per-blip via its `icon` field; when a blip has no
 * icon set, `getBlips()` falls back to this map. Concepts (techniques with no
 * brand) are intentionally omitted and render with their number instead.
 *
 * The actual glyph paths are fetched at dev time by `scripts/fetch-icons.mjs`
 * into `lib/icons.generated.ts` (zero runtime dependency, works offline).
 */
export const DEFAULT_ICONS: Record<string, string> = {
  typescript: "typescript",
  react: "react",
  nextjs: "nextdotjs",
  zod: "zod",
  tailwind: "tailwindcss",
  radix: "radixui",
  hono: "hono",
  expo: "expo",
  vercel: "vercel",
  supabase: "supabase",
  datocms: "datocms",
  "ai-gateway": "vercel",
  "cloudflare-workers": "cloudflareworkers",
  pnpm: "pnpm",
  playwright: "playwright",
  vitest: "vitest",
  "ai-assisted-dev": "claude",
};
