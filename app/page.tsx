import { getBlips } from "@/lib/content";
import { RadarApp } from "@/components/RadarApp";

// Render on every request, straight from DatoCMS — no static prerender, no cache.
export const dynamic = "force-dynamic";

export default async function Page() {
  const blips = await getBlips();
  return <RadarApp blips={blips} />;
}
