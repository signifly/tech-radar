import { z } from "zod";

/**
 * The four quadrants of the radar. These are stable slugs — the human-facing
 * labels live in `lib/radar.ts` so they can be renamed without touching data.
 */
export const QuadrantSchema = z.enum([
  "languages-frameworks",
  "platforms",
  "tools",
  "techniques",
]);
export type Quadrant = z.infer<typeof QuadrantSchema>;

/**
 * The four rings, ordered from the centre (most confident) outward.
 * `adopt`  — proven, use by default.
 * `trial`  — worth pursuing on real projects, with care.
 * `assess` — worth a spike / exploration to understand how it affects us.
 * `hold`   — proceed with caution; avoid new usage.
 */
export const RingSchema = z.enum(["adopt", "trial", "assess", "hold"]);
export type Ring = z.infer<typeof RingSchema>;

/**
 * How a blip moved since the previous radar volume — rendered as the little
 * triangle/arrow on the blip.
 */
export const MovementSchema = z.enum(["new", "in", "out", "none"]);
export type Movement = z.infer<typeof MovementSchema>;

export const BlipSchema = z.object({
  /** Stable identifier; also seeds the deterministic on-radar position. */
  id: z.string().min(1),
  name: z.string().min(1),
  quadrant: QuadrantSchema,
  ring: RingSchema,
  movement: MovementSchema.default("none"),
  /** Short rationale — why is this here, what did we learn? Markdown-ish plain text. */
  description: z.string().default(""),
  /** Optional free-form tags for filtering/search later. */
  tags: z.array(z.string()).default([]),
});
export type Blip = z.infer<typeof BlipSchema>;

export const BlipListSchema = z.array(BlipSchema);
