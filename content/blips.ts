import type { Blip } from "@/lib/schema";

/**
 * Seed data for the Signifly Tech Radar.
 *
 * This is the local source of truth today. When DatoCMS is wired up
 * (see `lib/content.ts`), `getBlips()` transparently switches to fetching
 * from the CMS and this file becomes the offline / preview fallback.
 *
 * Keep descriptions short and honest — the value of the radar is the
 * *rationale*, not just the position.
 */
export const blipsSeed: Blip[] = [
  /* ----------------------------- Languages & Frameworks ------------------- */
  {
    id: "typescript",
    name: "TypeScript",
    quadrant: "languages-frameworks",
    ring: "adopt",
    movement: "none",
    description:
      "The default for everything we write — app code, scripts, infra. Strict mode on. Non-negotiable for shared codebases.",
    tags: ["language", "core"],
  },
  {
    id: "react",
    name: "React",
    quadrant: "languages-frameworks",
    ring: "adopt",
    movement: "none",
    description:
      "Our UI foundation on web and (via React Native) mobile. React 19 + Server Components is now our baseline mental model.",
    tags: ["ui", "core"],
  },
  {
    id: "nextjs",
    name: "Next.js (App Router)",
    quadrant: "languages-frameworks",
    ring: "adopt",
    movement: "none",
    description:
      "Default web framework. App Router + Server Components first; we lean on Vercel for hosting. Reach for it unless there's a reason not to.",
    tags: ["framework", "web"],
  },
  {
    id: "zod",
    name: "Zod",
    quadrant: "languages-frameworks",
    ring: "adopt",
    movement: "in",
    description:
      "Runtime validation + inferred types at every trust boundary: forms, API payloads, CMS responses, env vars. Learning: parse once at the edge, trust the type inside.",
    tags: ["validation", "types"],
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    quadrant: "languages-frameworks",
    ring: "adopt",
    movement: "none",
    description:
      "Styling default. v4's CSS-first config removed most of the friction. Pairs well with Radix primitives + a small token layer.",
    tags: ["css", "styling"],
  },
  {
    id: "radix",
    name: "Radix UI",
    quadrant: "languages-frameworks",
    ring: "trial",
    movement: "in",
    description:
      "Unstyled, accessible primitives we style with Tailwind. Saves us from re-implementing focus traps and ARIA. Trial → likely Adopt next volume.",
    tags: ["ui", "a11y"],
  },
  {
    id: "hono",
    name: "Hono",
    quadrant: "languages-frameworks",
    ring: "trial",
    movement: "new",
    description:
      "Tiny, fast, standards-based router for edge/serverless APIs. Great when Next route handlers feel too heavy or we need a portable backend.",
    tags: ["backend", "api"],
  },
  {
    id: "expo",
    name: "Expo (React Native)",
    quadrant: "languages-frameworks",
    ring: "trial",
    movement: "in",
    description:
      "Our path to mobile. EAS builds + OTA updates keep the loop tight and let web-first devs ship native. Watch native-module boundaries.",
    tags: ["mobile", "react-native"],
  },

  /* --------------------------------- Platforms ---------------------------- */
  {
    id: "vercel",
    name: "Vercel",
    quadrant: "platforms",
    ring: "adopt",
    movement: "none",
    description:
      "Primary hosting + CI/CD for web. Preview deploys per PR are core to how we review. Fluid Compute covers most backend needs now.",
    tags: ["hosting", "ci"],
  },
  {
    id: "supabase",
    name: "Supabase",
    quadrant: "platforms",
    ring: "trial",
    movement: "in",
    description:
      "Postgres + auth + storage when a project needs a real database and we don't want to run infra. Learning: treat RLS as a first-class design task, not an afterthought.",
    tags: ["database", "auth", "postgres"],
  },
  {
    id: "datocms",
    name: "DatoCMS",
    quadrant: "platforms",
    ring: "adopt",
    movement: "none",
    description:
      "Structured, GraphQL-first headless CMS. Our default for editorial content — including the source of this radar. Great DX for modelling.",
    tags: ["cms", "content"],
  },
  {
    id: "ai-gateway",
    name: "Vercel AI Gateway",
    quadrant: "platforms",
    ring: "assess",
    movement: "new",
    description:
      "Single API across model providers with fallbacks + observability. Assessing as the seam for AI features so we're not locked to one vendor.",
    tags: ["ai", "gateway"],
  },
  {
    id: "cloudflare-workers",
    name: "Cloudflare Workers",
    quadrant: "platforms",
    ring: "assess",
    movement: "none",
    description:
      "Edge compute for latency-sensitive or globally-distributed bits. Pairs naturally with Hono. Assessing where it beats staying all-in on Vercel.",
    tags: ["edge", "compute"],
  },

  /* ----------------------------------- Tools ------------------------------ */
  {
    id: "pnpm",
    name: "pnpm",
    quadrant: "tools",
    ring: "adopt",
    movement: "none",
    description:
      "Fast, disk-efficient package manager and our monorepo workspace backbone. Standardised across the team.",
    tags: ["package-manager"],
  },
  {
    id: "fumadocs",
    name: "Fumadocs",
    quadrant: "tools",
    ring: "trial",
    movement: "new",
    description:
      "Next.js-native docs framework for internal handbooks and project docs. Fast to stand up; MDX + good search out of the box.",
    tags: ["docs"],
  },
  {
    id: "scalar",
    name: "Scalar",
    quadrant: "tools",
    ring: "trial",
    movement: "new",
    description:
      "Beautiful, interactive API reference from an OpenAPI spec. Replacing hand-maintained API docs. Pairs with Hono/Zod-generated schemas.",
    tags: ["docs", "api"],
  },
  {
    id: "c4-model",
    name: "C4 model",
    quadrant: "tools",
    ring: "assess",
    movement: "none",
    description:
      "Lightweight way to diagram architecture at consistent zoom levels (Context → Container → Component). Assessing as our shared drawing vocabulary.",
    tags: ["architecture", "diagrams"],
  },
  {
    id: "playwright",
    name: "Playwright",
    quadrant: "tools",
    ring: "trial",
    movement: "in",
    description:
      "End-to-end tests that actually catch regressions. Good CI story on Vercel. Trial while we build the muscle of writing them by default.",
    tags: ["testing", "e2e"],
  },
  {
    id: "vitest",
    name: "Vitest",
    quadrant: "tools",
    ring: "adopt",
    movement: "in",
    description:
      "Default unit/integration test runner. Fast, ESM-native, Vite-aligned. Learning: colocate tests with code and keep them cheap to run.",
    tags: ["testing"],
  },

  /* -------------------------------- Techniques ---------------------------- */
  {
    id: "type-safe-contracts",
    name: "End-to-end type safety",
    quadrant: "techniques",
    ring: "adopt",
    movement: "none",
    description:
      "One Zod schema, shared from DB/CMS through API to UI. Fewer runtime surprises, self-documenting boundaries. This is how we build now.",
    tags: ["types", "architecture"],
  },
  {
    id: "server-components-first",
    name: "Server Components first",
    quadrant: "techniques",
    ring: "trial",
    movement: "in",
    description:
      "Default to server rendering; add 'use client' only where interactivity demands it. Learning: it changes data-fetching habits — push fetching down, pass data in.",
    tags: ["react", "rsc"],
  },
  {
    id: "trunk-based",
    name: "Trunk-based development",
    quadrant: "techniques",
    ring: "adopt",
    movement: "none",
    description:
      "Short-lived branches, small PRs, merge to main behind preview deploys. Keeps integration pain low and shipping continuous.",
    tags: ["process", "git"],
  },
  {
    id: "ai-assisted-dev",
    name: "AI-assisted development",
    quadrant: "techniques",
    ring: "trial",
    movement: "new",
    description:
      "Agentic coding tools in the everyday loop (scaffolding, review, refactors). Trial with guardrails: humans own the diff, tests gate the merge.",
    tags: ["ai", "productivity"],
  },
  {
    id: "design-tokens",
    name: "Design tokens",
    quadrant: "techniques",
    ring: "assess",
    movement: "none",
    description:
      "A single source of truth for colour/space/type shared between design and code. Assessing the pipeline from design tool → Tailwind theme.",
    tags: ["design-systems"],
  },
  {
    id: "feature-flags",
    name: "Feature flags",
    quadrant: "techniques",
    ring: "assess",
    movement: "none",
    description:
      "Decouple deploy from release for safer rollouts and trunk-based work. Assessing a lightweight approach that doesn't add a heavy platform.",
    tags: ["process", "delivery"],
  },
];
