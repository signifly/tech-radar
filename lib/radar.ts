import type { Quadrant, Ring, Blip } from "./schema";

/* -------------------------------------------------------------------------- */
/*  Presentation config — labels & colours for quadrants and rings.           */
/*  Data files only ever reference the slugs; everything human-facing is here. */
/* -------------------------------------------------------------------------- */

export type QuadrantConfig = {
  slug: Quadrant;
  label: string;
  /** Corner the quadrant occupies, and its neon accent colour. */
  color: string;
  /** Angular wedge in radians [start, end], measured math-style (CCW from +x). */
  angle: [number, number];
};

const HALF_PI = Math.PI / 2;

/**
 * Quadrant order maps to the four corners:
 *   0 = top-right, 1 = top-left, 2 = bottom-left, 3 = bottom-right.
 */
export const QUADRANTS: QuadrantConfig[] = [
  {
    slug: "languages-frameworks",
    label: "Languages & Frameworks",
    color: "#22d3ee", // cyan
    angle: [0, HALF_PI],
  },
  {
    slug: "tools",
    label: "Tools",
    color: "#a78bfa", // violet
    angle: [HALF_PI, Math.PI],
  },
  {
    slug: "techniques",
    label: "Techniques",
    color: "#34d399", // emerald
    angle: [Math.PI, 3 * HALF_PI],
  },
  {
    slug: "platforms",
    label: "Platforms",
    color: "#fbbf24", // amber
    angle: [3 * HALF_PI, 2 * Math.PI],
  },
];

export const QUADRANT_BY_SLUG: Record<Quadrant, QuadrantConfig> =
  Object.fromEntries(QUADRANTS.map((q) => [q.slug, q])) as Record<
    Quadrant,
    QuadrantConfig
  >;

export type RingConfig = {
  slug: Ring;
  label: string;
  /** Normalised [inner, outer] radius, 0 = centre, 1 = outer edge. */
  radius: [number, number];
  blurb: string;
};

export const RINGS: RingConfig[] = [
  {
    slug: "adopt",
    label: "Adopt",
    radius: [0, 0.35],
    blurb: "Proven for us. Reach for these by default.",
  },
  {
    slug: "trial",
    label: "Trial",
    radius: [0.35, 0.6],
    blurb: "Worth pursuing on real projects — with a little care.",
  },
  {
    slug: "assess",
    label: "Assess",
    radius: [0.6, 0.82],
    blurb: "Promising. Worth a spike to see how it fits.",
  },
  {
    slug: "hold",
    label: "Hold",
    radius: [0.82, 1],
    blurb: "Proceed with caution. Avoid new usage.",
  },
];

export const RING_INDEX: Record<Ring, number> = {
  adopt: 0,
  trial: 1,
  assess: 2,
  hold: 3,
};

/* -------------------------------------------------------------------------- */
/*  Deterministic blip placement.                                             */
/*  A blip's on-radar position is derived from its id, so it never jumps      */
/*  between renders but is nicely scattered within its quadrant + ring band.  */
/* -------------------------------------------------------------------------- */

/** Small, stable string hash → unsigned 32-bit int. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Two independent, deterministic values in [0, 1) derived from a seed. */
function seededPair(seed: string): [number, number] {
  const a = hash(seed);
  const b = hash(seed + "#salt");
  return [a / 0xffffffff, b / 0xffffffff];
}

export type Point = { x: number; y: number };

/**
 * Position of a blip in NORMALISED radar space where the origin is the centre
 * and the outer ring sits at radius 1. Multiply by pixel radius to draw.
 * A margin keeps blips off the ring boundaries and quadrant axes.
 */
export function blipPosition(blip: Pick<Blip, "id" | "quadrant" | "ring">): Point {
  const q = QUADRANT_BY_SLUG[blip.quadrant];
  const r = RINGS[RING_INDEX[blip.ring]];
  const [t, u] = seededPair(blip.id);

  const angleMargin = 0.06;
  const [a0, a1] = q.angle;
  const angle = a0 + angleMargin * (a1 - a0) + t * (1 - 2 * angleMargin) * (a1 - a0);

  const radiusMargin = 0.07;
  const [r0, r1] = r.radius;
  const radius =
    r0 + radiusMargin + u * ((r1 - r0) - 2 * radiusMargin);

  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
