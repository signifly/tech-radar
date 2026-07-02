"use client";

import { useEffect, useMemo, useState } from "react";
import type { Blip, Quadrant, Ring } from "@/lib/schema";
import {
  QUADRANTS,
  RINGS,
  RING_INDEX,
  QUADRANT_BY_SLUG,
  blipPosition,
} from "@/lib/radar";
import { RadarCanvas, type RadarItem, type Camera } from "./RadarCanvas";
import { MeshBackground } from "./MeshBackground";
import { SigniflyLogo } from "./SigniflyLogo";

const MOVEMENT_LABEL: Record<Blip["movement"], string> = {
  new: "New",
  in: "Moved in",
  out: "Moved out",
  none: "No change",
};

type Focus =
  | { kind: "none" }
  | { kind: "quadrant"; q: Quadrant }
  | { kind: "blip"; id: string };

export function RadarApp({ blips }: { blips: Blip[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [quadFilter, setQuadFilter] = useState<Set<Quadrant>>(new Set());
  const [ringFilter, setRingFilter] = useState<Set<Ring>>(new Set());
  const [focus, setFocus] = useState<Focus>({ kind: "none" });

  // Stable global ordering & numbering: by quadrant, then ring, then name.
  const numbered = useMemo(() => {
    const sorted = [...blips].sort((a, b) => {
      const qa = QUADRANTS.findIndex((q) => q.slug === a.quadrant);
      const qb = QUADRANTS.findIndex((q) => q.slug === b.quadrant);
      if (qa !== qb) return qa - qb;
      if (RING_INDEX[a.ring] !== RING_INDEX[b.ring])
        return RING_INDEX[a.ring] - RING_INDEX[b.ring];
      return a.name.localeCompare(b.name);
    });
    return sorted.map((b, i) => ({ ...b, n: i + 1 }));
  }, [blips]);

  const items: RadarItem[] = useMemo(
    () =>
      numbered.map((b) => ({
        ...b,
        active:
          (quadFilter.size === 0 || quadFilter.has(b.quadrant)) &&
          (ringFilter.size === 0 || ringFilter.has(b.ring)) &&
          (focus.kind !== "quadrant" || b.quadrant === focus.q),
      })),
    [numbered, quadFilter, ringFilter, focus],
  );

  const selected = items.find((b) => b.id === selectedId) ?? null;

  // Target camera — the canvas eases toward this with deceleration.
  const camera: Camera = useMemo(() => {
    if (focus.kind === "blip") {
      const b = numbered.find((x) => x.id === focus.id);
      if (b) {
        const p = blipPosition(b);
        return { fx: p.x, fy: p.y, z: 2.3 };
      }
    }
    if (focus.kind === "quadrant") {
      const q = QUADRANT_BY_SLUG[focus.q];
      const mid = (q.angle[0] + q.angle[1]) / 2;
      const rr = 0.5;
      return { fx: Math.cos(mid) * rr, fy: Math.sin(mid) * rr, z: 1.7 };
    }
    return { fx: 0, fy: 0, z: 1 };
  }, [focus, numbered]);

  const reset = () => {
    setSelectedId(null);
    setFocus({ kind: "none" });
  };
  const selectBlip = (id: string) => {
    setSelectedId(id);
    setFocus({ kind: "blip", id });
  };
  // Clicking an already-pinned blip zooms back out (single action).
  const handleSelect = (id: string) =>
    id === selectedId ? reset() : selectBlip(id);
  const pickFromIndex = handleSelect;

  const onBackground = (ux: number, uy: number) => {
    // When zoomed on a blip, any empty click pulls straight back out.
    if (focus.kind === "blip") {
      reset();
      return;
    }
    const r = Math.hypot(ux, uy);
    if (r < 0.14 || r > 1.02) {
      reset();
      return;
    }
    let ang = Math.atan2(uy, ux);
    if (ang < 0) ang += Math.PI * 2;
    const q =
      QUADRANTS.find((qq) => ang >= qq.angle[0] && ang < qq.angle[1]) ??
      QUADRANTS[0];
    // Same quadrant → out; different quadrant → switch directly (one action).
    if (focus.kind === "quadrant" && focus.q === q.slug) reset();
    else {
      setSelectedId(null);
      setFocus({ kind: "quadrant", q: q.slug });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setFocus({ kind: "none" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = <T,>(set: Set<T>, val: T): Set<T> => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  };

  const focusLabel =
    focus.kind === "quadrant"
      ? QUADRANT_BY_SLUG[focus.q].label
      : focus.kind === "blip"
        ? (numbered.find((x) => x.id === focus.id)?.name ?? "")
        : "";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <MeshBackground />
      <RadarCanvas
        items={items}
        selectedId={selectedId}
        hoveredId={hoveredId}
        camera={camera}
        onSelect={handleSelect}
        onBackground={onBackground}
        onHover={setHoveredId}
      />

      {/* -------- brand lockup: top-right -------- */}
      <div className="absolute right-5 top-5 z-30 flex items-center gap-3 xl:right-8 xl:top-8">
        <SigniflyLogo className="h-4 w-auto text-[var(--color-ink)] sm:h-[18px]" />
        <span className="h-4 w-px bg-[var(--color-line)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-dim)] sm:text-[11px]">
          Tech Radar
        </span>
      </div>

      {/* -------- reset view: top-left, appears when zoomed -------- */}
      {focus.kind !== "none" && (
        <div className="absolute left-5 top-5 z-30 xl:left-8 xl:top-8">
          <button
            onClick={reset}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-dim)] transition hover:text-[var(--color-ink)]"
          >
            <span aria-hidden>⤢</span>
            <span className="max-w-[40vw] truncate text-[var(--color-ink)]">
              {focusLabel}
            </span>
            <span className="text-[var(--color-ink-faint)]">Reset ⎋</span>
          </button>
        </div>
      )}

      {/* -------- left: intro / selected detail (floating text) -------- */}
      <div className="absolute bottom-24 left-5 z-20 w-[300px] max-w-[calc(100vw-2.5rem)] sm:bottom-28 xl:left-8 xl:top-1/2 xl:bottom-auto xl:-translate-y-1/2">
        {selected ? (
          <DetailCard blip={selected} onClose={reset} />
        ) : (
          <IntroCard />
        )}
      </div>

      {/* -------- right: blip index (floating text) -------- */}
      <div className="absolute right-4 top-20 bottom-28 z-20 hidden w-[270px] overflow-y-auto md:block xl:right-8 xl:top-24 xl:bottom-24">
        <BlipIndex
          items={items}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={pickFromIndex}
        />
      </div>

      {/* -------- filters: bottom-centre (floating) -------- */}
      <div className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 xl:bottom-6">
        <Filters
          quadFilter={quadFilter}
          ringFilter={ringFilter}
          onQuad={(q) => setQuadFilter((s) => toggle(s, q))}
          onRing={(r) => setRingFilter((s) => toggle(s, r))}
          onClear={() => {
            setQuadFilter(new Set());
            setRingFilter(new Set());
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Filters({
  quadFilter,
  ringFilter,
  onQuad,
  onRing,
  onClear,
}: {
  quadFilter: Set<Quadrant>;
  ringFilter: Set<Ring>;
  onQuad: (q: Quadrant) => void;
  onRing: (r: Ring) => void;
  onClear: () => void;
}) {
  const hasFilter = quadFilter.size > 0 || ringFilter.size > 0;
  return (
    <>
      {QUADRANTS.map((q) => {
        const on = quadFilter.has(q.slug);
        return (
          <button
            key={q.slug}
            onClick={() => onQuad(q.slug)}
            style={
              on
                ? { background: q.color, borderColor: q.color, color: "#08090c" }
                : { borderColor: `${q.color}55`, color: q.color }
            }
            className="rounded-none border px-2.5 py-1 text-[11px] font-medium transition"
          >
            {q.label}
          </button>
        );
      })}
      <span className="mx-1 hidden h-4 w-px bg-[var(--color-line)] sm:block" />
      {RINGS.map((r) => {
        const on = ringFilter.has(r.slug);
        return (
          <button
            key={r.slug}
            onClick={() => onRing(r.slug)}
            className={`rounded-none border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
              on
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-void)]"
                : "border-[var(--color-line)] bg-[var(--color-void)]/40 text-[var(--color-ink-dim)] hover:border-[var(--color-ink-dim)]"
            }`}
          >
            {r.label}
          </button>
        );
      })}
      {hasFilter && (
        <button
          onClick={onClear}
          className="ml-1 rounded-none px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)] transition hover:text-[var(--color-ink)]"
        >
          Reset
        </button>
      )}
    </>
  );
}

function IntroCard() {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]">
        How to read the radar
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
        Each blip is a technology, tool or technique. The closer to the centre,
        the more confident we are in reaching for it.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        Click a quadrant to fly into it · click a blip to zoom in · Esc to pull
        back out.
      </p>
      <ul className="mt-3 space-y-1.5">
        {RINGS.map((r) => (
          <li key={r.slug} className="flex gap-2 text-[12px]">
            <span className="mt-[2px] w-12 shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              {r.label}
            </span>
            <span className="text-[var(--color-ink-dim)]">{r.blurb}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailCard({ blip, onClose }: { blip: RadarItem; onClose: () => void }) {
  const q = QUADRANT_BY_SLUG[blip.quadrant];
  const ring = RINGS[RING_INDEX[blip.ring]];
  return (
    <div style={{ animation: "blip-in 160ms ease-out" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-none font-mono text-[11px] font-bold text-[var(--color-void)]"
              style={{ background: q.color }}
            >
              {blip.n}
            </span>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">
              {blip.name}
            </h2>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
            <span style={{ color: q.color }}>{q.label}</span>
            <span className="text-[var(--color-ink-faint)]">·</span>
            <span className="text-[var(--color-ink-dim)]">{ring.label}</span>
            <span className="text-[var(--color-ink-faint)]">·</span>
            <span className="text-[var(--color-ink-faint)]">
              {MOVEMENT_LABEL[blip.movement]}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close and zoom out"
          className="rounded-none px-2 py-1 font-mono text-xs text-[var(--color-ink-faint)] transition hover:text-[var(--color-ink)]"
        >
          ✕
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
        {blip.description || "No notes yet."}
      </p>

      {blip.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {blip.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] text-[var(--color-ink-faint)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BlipIndex({
  items,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: {
  items: RadarItem[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const groups = QUADRANTS.map((q) => ({
    q,
    blips: items.filter((b) => b.quadrant === q.slug),
  }));

  return (
    <div>
      {groups.map(({ q, blips }) => (
        <div key={q.slug} className="mb-3 last:mb-0">
          <div
            className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: q.color }}
          >
            {q.label}
          </div>
          <ul className="space-y-0.5">
            {blips.map((b) => {
              const on = b.id === hoveredId || b.id === selectedId;
              return (
                <li key={b.id}>
                  <button
                    onMouseEnter={() => onHover(b.id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onSelect(b.id)}
                    className={`flex w-full items-center gap-2 rounded-none px-1 py-1 text-left text-[12px] transition ${
                      on
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                    } ${b.active ? "" : "opacity-40"}`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-none font-mono text-[9px] font-bold text-[var(--color-void)]"
                      style={{ background: q.color }}
                    >
                      {b.n}
                    </span>
                    <span className="truncate">{b.name}</span>
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                      {b.ring}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
