import { BlipListSchema, type Blip } from "./schema";
import { blipsSeed } from "@/content/blips";

/**
 * The single boundary between the radar UI and where blips come from.
 *
 * Today it validates and returns the local seed. To go live on DatoCMS you
 * only change THIS file: set the two env vars and implement `getBlipsFromDato`
 * below (a starting query is included). Everything downstream is already typed
 * against `Blip`, so nothing else needs to move.
 */
export async function getBlips(): Promise<Blip[]> {
  if (process.env.DATOCMS_API_TOKEN) {
    try {
      return await getBlipsFromDato();
    } catch (err) {
      // Never blank the radar because the CMS hiccupped — fall back to seed.
      console.error("[radar] DatoCMS fetch failed, using seed data:", err);
    }
  }
  return BlipListSchema.parse(blipsSeed);
}

/* -------------------------------------------------------------------------- */
/*  DatoCMS integration (inactive until DATOCMS_API_TOKEN is set).            */
/*                                                                            */
/*  Suggested model in DatoCMS — a "Radar blip" model with fields:           */
/*    name        (single-line string)                                        */
/*    slug        (slug, from name)  -> maps to Blip.id                       */
/*    quadrant    (single select: languages-frameworks|platforms|tools|       */
/*                 techniques)                                                 */
/*    ring        (single select: adopt|trial|assess|hold)                    */
/*    movement    (single select: new|in|out|none)                           */
/*    description (multi-line text / structured text)                         */
/*    tags        (multiple strings, optional)                                */
/* -------------------------------------------------------------------------- */

const DATO_ENDPOINT = "https://graphql.datocms.com/";

const BLIPS_QUERY = /* GraphQL */ `
  query AllRadarBlips {
    allRadarBlips(first: 500) {
      slug
      name
      quadrant
      ring
      movement
      description
      tags
    }
  }
`;

async function getBlipsFromDato(): Promise<Blip[]> {
  const res = await fetch(DATO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DATOCMS_API_TOKEN}`,
      // Use draft content in preview environments.
      ...(process.env.DATOCMS_DRAFT === "true"
        ? { "X-Include-Drafts": "true" }
        : {}),
    },
    body: JSON.stringify({ query: BLIPS_QUERY }),
    // Always fetch fresh from DatoCMS — no caching (see force-dynamic in page.tsx).
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`DatoCMS responded ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: { allRadarBlips?: unknown[] };
    errors?: unknown;
  };
  if (json.errors) {
    throw new Error(`DatoCMS query error: ${JSON.stringify(json.errors)}`);
  }

  const raw = json.data?.allRadarBlips ?? [];
  // Normalise CMS shape → our Blip shape, then validate.
  const mapped = raw.map((r) => {
    const b = r as Record<string, unknown>;
    return {
      id: b.slug,
      name: b.name,
      quadrant: b.quadrant,
      ring: b.ring,
      movement: b.movement ?? "none",
      description: b.description ?? "",
      tags: Array.isArray(b.tags) ? b.tags : [],
    };
  });

  return BlipListSchema.parse(mapped);
}
