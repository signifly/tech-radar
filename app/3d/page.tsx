import { getBlips } from "@/lib/content";
import { Radar3D } from "@/components/Radar3D";

// Render on every request, straight from DatoCMS — no static prerender, no cache.
export const dynamic = "force-dynamic";

export default async function Page() {
  const blips = await getBlips();
  return <Radar3D blips={blips} />;
}
