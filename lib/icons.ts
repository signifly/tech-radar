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
  // enrichment from repo scan
  "react-hook-form": "reacthookform",
  "graphql-codegen": "graphql",
  "vercel-ai-sdk": "vercel",
  "framer-motion": "framer",
  "tanstack-query": "reactquery",
  laravel: "laravel",
  trpc: "trpc",
  "react-router": "reactrouter",
  gsap: "greensock",
  php: "php",
  shopify: "shopify",
  "github-actions": "githubactions",
  algolia: "algolia",
  upstash: "upstash",
  meilisearch: "meilisearch",
  docker: "docker",
  shadcn: "shadcnui",
  lucide: "lucide",
  turborepo: "turborepo",
  prisma: "prisma",
  storybook: "storybook",
  jest: "jest",
  webpack: "webpack",
};
