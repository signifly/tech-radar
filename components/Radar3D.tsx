"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Blip, Ring } from "@/lib/schema";
import {
  QUADRANTS,
  RINGS,
  RING_INDEX,
  QUADRANT_BY_SLUG,
  blipPosition,
} from "@/lib/radar";
import { SigniflyLogo } from "./SigniflyLogo";
import { ViewTabs } from "./ViewTabs";

const MOVEMENT_LABEL: Record<Blip["movement"], string> = {
  new: "New",
  in: "Moved in",
  out: "Moved out",
  none: "No change",
};

// Pin height per ring — adopt stands tall & central, hold is low & outer.
const RING_HEIGHT: Record<Ring, number> = {
  adopt: 0.52,
  trial: 0.38,
  assess: 0.26,
  hold: 0.15,
};

/* ---- tiny colour helpers for spherical shading ---- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function mix(hex: string, target: number, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (c: number) => Math.round(c + (target - c) * t);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
const lighten = (hex: string, t: number) => mix(hex, 255, t);
const darken = (hex: string, t: number) => mix(hex, 0, t);
function hexA(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

type Node = {
  id: string;
  name: string;
  quadrant: Blip["quadrant"];
  ring: Ring;
  movement: Blip["movement"];
  description: string;
  n: number;
  px: number; // ground x, radar unit
  pz: number; // ground z, radar unit
  angle: number; // ground angle (atan2)
  height: number;
  color: string;
};

type Proj = { x: number; y: number; s: number; zc: number } | null;

export function Radar3D({ blips }: { blips: Blip[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodes = useMemo<Node[]>(() => {
    const sorted = [...blips].sort((a, b) => {
      const qa = QUADRANTS.findIndex((q) => q.slug === a.quadrant);
      const qb = QUADRANTS.findIndex((q) => q.slug === b.quadrant);
      if (qa !== qb) return qa - qb;
      if (RING_INDEX[a.ring] !== RING_INDEX[b.ring])
        return RING_INDEX[a.ring] - RING_INDEX[b.ring];
      return a.name.localeCompare(b.name);
    });
    return sorted.map((b, i) => {
      const p = blipPosition(b);
      return {
        id: b.id,
        name: b.name,
        quadrant: b.quadrant,
        ring: b.ring,
        movement: b.movement,
        description: b.description,
        n: i + 1,
        px: p.x,
        pz: p.y, // 2D y becomes ground z
        angle: Math.atan2(p.y, p.x),
        height: RING_HEIGHT[b.ring],
        color: QUADRANT_BY_SLUG[b.quadrant].color,
      };
    });
  }, [blips]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const stateRef = useRef({ selectedId, hoveredId });
  stateRef.current = { selectedId, hoveredId };

  // camera refs (mutated by the loop / interaction, never trigger re-render)
  const yaw = useRef(-0.9);
  const pitch = useRef(0.62);
  const camDist = useRef(3.0);
  const targetYaw = useRef<number | null>(null);
  const hitsRef = useRef<Array<{ id: string; x: number; y: number; r: number }>>(
    [],
  );

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  // Spin a selected/tabbed blip to the front of the camera.
  useEffect(() => {
    if (!selectedId) {
      targetYaw.current = null;
      return;
    }
    const node = nodesRef.current.find((n) => n.id === selectedId);
    if (node) targetYaw.current = -Math.PI / 2 - node.angle;
  }, [selectedId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let W = 0;
    let H = 0;
    let raf = 0;
    let down = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = Math.max(240, Math.floor(rect.width));
      H = Math.max(240, Math.floor(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const project = (x: number, y: number, z: number): Proj => {
      const cyaw = Math.cos(yaw.current);
      const syaw = Math.sin(yaw.current);
      const x1 = x * cyaw - z * syaw;
      const z1 = x * syaw + z * cyaw;
      const cp = Math.cos(pitch.current);
      const sp = Math.sin(pitch.current);
      const y2 = y * cp + z1 * sp;
      const z2 = z1 * cp - y * sp;
      const zc = z2 + camDist.current;
      if (zc < 0.2) return null;
      const focal = Math.min(W, H) * 1.05;
      const f = focal / zc;
      const cx = W / 2;
      const cy = H * 0.54;
      return { x: cx + x1 * f, y: cy - y2 * f, s: f, zc };
    };

    const draw = (now: number) => {
      const { selectedId, hoveredId } = stateRef.current;
      const nodes = nodesRef.current;

      ctx.clearRect(0, 0, W, H);

      // ---- ground: ring circles ----
      for (let i = 0; i < RINGS.length; i++) {
        const rr = RINGS[i].radius[1];
        ctx.beginPath();
        let started = false;
        for (let k = 0; k <= 72; k++) {
          const a = (k / 72) * Math.PI * 2;
          const p = project(Math.cos(a) * rr, 0, Math.sin(a) * rr);
          if (!p) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle =
          i === RINGS.length - 1
            ? "rgba(230,240,255,0.20)"
            : "rgba(230,240,255,0.09)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ---- ground: quadrant axes ----
      ctx.strokeStyle = "rgba(230,240,255,0.10)";
      ctx.lineWidth = 1;
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2;
        const p0 = project(0, 0, 0);
        const p1 = project(Math.cos(a), 0, Math.sin(a));
        if (p0 && p1) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }

      // ---- ground: quadrant labels ----
      ctx.font = "700 11px var(--font-sans, system-ui, sans-serif)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const q of QUADRANTS) {
        const mid = (q.angle[0] + q.angle[1]) / 2;
        const p = project(Math.cos(mid) * 1.12, 0, Math.sin(mid) * 1.12);
        if (!p) continue;
        ctx.fillStyle = q.color;
        ctx.globalAlpha = 0.9;
        ctx.fillText(q.label.toUpperCase(), p.x, p.y);
        ctx.globalAlpha = 1;
      }

      // ---- blips (pins), depth-sorted far → near ----
      const drawList = nodes
        .map((node) => {
          const top = project(node.px, node.height, node.pz);
          const ground = project(node.px, 0, node.pz);
          return { node, top, ground };
        })
        .filter((d) => d.top && d.ground)
        .sort((a, b) => b.top!.zc - a.top!.zc);

      const hits: Array<{ id: string; x: number; y: number; r: number }> = [];

      for (const { node, top, ground } of drawList) {
        const t = top!;
        const g = ground!;
        const isSel = node.id === selectedId;
        const isHov = node.id === hoveredId;
        const emph = isSel || isHov;
        const color = node.color;

        // ground shadow
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, 6 * (g.s / 300), 3 * (g.s / 300), 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();

        // stem
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = emph ? 0.7 : 0.3;
        ctx.lineWidth = emph ? 1.5 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // sphere at the top of the pin
        const r = Math.max(3, 0.05 * t.s) * (emph ? 1.25 : 1);
        hits.push({ id: node.id, x: t.x, y: t.y, r });

        // hover pulse — expanding rings behind the ball
        if (isHov) {
          const period = 1100;
          for (let k = 0; k < 2; k++) {
            const phase = ((now / period + k * 0.5) % 1 + 1) % 1;
            const pr = r + phase * (r * 2.4);
            ctx.beginPath();
            ctx.arc(t.x, t.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = hexA(color, (1 - phase) * 0.5);
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        const hx = t.x - r * 0.34;
        const hy = t.y - r * 0.34;

        if (node.movement === "new") {
          // hollow, still shaded on the rim
          ctx.beginPath();
          ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
          ctx.fillStyle = "#08090c";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // spherical shading: highlight → base → shaded rim
          const grad = ctx.createRadialGradient(
            hx,
            hy,
            r * 0.1,
            t.x,
            t.y,
            r * 1.05,
          );
          grad.addColorStop(0, lighten(color, 0.62));
          grad.addColorStop(0.5, color);
          grad.addColorStop(1, darken(color, 0.55));
          ctx.beginPath();
          ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          // specular glint
          ctx.beginPath();
          ctx.arc(hx, hy, r * 0.24, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fill();
        }

        if (isSel) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        if (emph) {
          // label
          ctx.font = "600 12px var(--font-sans, system-ui, sans-serif)";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const tx = t.x + r + 8;
          const tw = ctx.measureText(node.name).width;
          ctx.fillStyle = "rgba(8,9,12,0.78)";
          ctx.fillRect(tx - 3, t.y - 9, tw + 6, 18);
          ctx.fillStyle = color;
          ctx.fillText(node.name, tx, t.y);
        }
      }
      hitsRef.current = hits;
    };

    const step = (now: number) => {
      if (down) {
        // orbit handled in move
      } else if (targetYaw.current !== null) {
        let dy = targetYaw.current - yaw.current;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw.current += dy * 0.08;
        if (Math.abs(dy) < 0.002) yaw.current = targetYaw.current;
      } else if (!reduce) {
        yaw.current += 0.0022; // idle auto-orbit
      }
      draw(now);
      raf = requestAnimationFrame(step);
    };

    const pickHit = (mx: number, my: number): string | null => {
      let best: string | null = null;
      let bestD = Infinity;
      for (const h of hitsRef.current) {
        const dx = h.x - mx;
        const dy = h.y - my;
        const d = dx * dx + dy * dy;
        const rr = (h.r + 7) * (h.r + 7);
        if (d < rr && d < bestD) {
          bestD = d;
          best = h.id;
        }
      }
      return best;
    };

    const local = (e: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      down = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (down) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        targetYaw.current = null; // free orbit cancels focus
        yaw.current += dx * 0.006;
        pitch.current = Math.min(1.2, Math.max(0.15, pitch.current - dy * 0.005));
      } else {
        const { x, y } = local(e);
        const id = pickHit(x, y);
        setHoveredId(id);
        canvas.style.cursor = id ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (down && !moved) {
        const { x, y } = local(e);
        const id = pickHit(x, y);
        setSelectedId(id); // null clears selection
      }
      down = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist.current = Math.min(
        5,
        Math.max(2.2, camDist.current + e.deltaY * 0.002),
      );
    };
    const onKey = (e: KeyboardEvent) => {
      const list = nodesRef.current;
      if (!list.length) return;
      if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowLeft" || e.shiftKey ? -1 : 1;
        const cur = selectedRef.current;
        const idx = cur ? list.findIndex((n) => n.id === cur) : -1;
        const next = (idx + dir + list.length) % list.length;
        setSelectedId(list[next].id);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    canvas.style.cursor = "grab";

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div ref={wrapRef} className="relative min-h-screen w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* view tabs — top-centre */}
      <div className="absolute left-1/2 top-5 z-30 -translate-x-1/2 xl:top-8">
        <ViewTabs />
      </div>

      {/* brand — top-right */}
      <div className="absolute right-5 top-5 z-30 flex items-center gap-3 xl:right-8 xl:top-8">
        <SigniflyLogo className="h-4 w-auto text-[var(--color-ink)] sm:h-[18px]" />
        <span className="h-4 w-px bg-[var(--color-line)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-dim)] sm:text-[11px]">
          Tech Radar · 3D
        </span>
      </div>

      {/* quadrant legend — top-left */}
      <div className="absolute left-5 top-5 z-20 flex flex-col gap-1 xl:left-8 xl:top-8">
        {QUADRANTS.map((q) => (
          <div
            key={q.slug}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: q.color }}
            />
            {q.label}
          </div>
        ))}
      </div>

      {/* detail — bottom-left */}
      {selected && (
        <div
          className="absolute bottom-16 left-5 z-20 w-[300px] max-w-[calc(100vw-2.5rem)] xl:bottom-10 xl:left-8"
          style={{ animation: "blip-in 160ms ease-out" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-none font-mono text-[11px] font-bold text-[var(--color-void)]"
              style={{ background: selected.color }}
            >
              {selected.n}
            </span>
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">
              {selected.name}
            </h2>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
            <span style={{ color: selected.color }}>
              {QUADRANT_BY_SLUG[selected.quadrant].label}
            </span>
            <span className="text-[var(--color-ink-faint)]">·</span>
            <span className="text-[var(--color-ink-dim)]">
              {RINGS[RING_INDEX[selected.ring]].label}
            </span>
            <span className="text-[var(--color-ink-faint)]">·</span>
            <span className="text-[var(--color-ink-faint)]">
              {MOVEMENT_LABEL[selected.movement]}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-dim)]">
            {selected.description || "No notes yet."}
          </p>
        </div>
      )}

      {/* hint — bottom-centre */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        drag to orbit · scroll to zoom · Tab to cycle blips · pin height = ring
      </div>
    </div>
  );
}
