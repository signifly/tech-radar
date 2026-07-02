import { getBlips } from "@/lib/content";
import { RadarApp } from "@/components/RadarApp";

export default async function Page() {
  const blips = await getBlips();
  return <RadarApp blips={blips} />;
}
