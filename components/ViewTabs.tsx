"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["2D", "/"],
  ["3D", "/3d"],
] as const;

/** Switch between the flat radar (/) and the 3D radar (/3d). */
export function ViewTabs() {
  const path = usePathname();
  return (
    <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em]">
      {TABS.map(([label, href]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-none border px-2.5 py-1 transition ${
              active
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-void)]"
                : "border-[var(--color-line)] text-[var(--color-ink-dim)] hover:border-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
