"use client";

import { useEffect, useRef } from "react";
import type { Blip } from "@/lib/schema";
import {
  QUADRANTS,
  RINGS,
  QUADRANT_BY_SLUG,
  blipPosition,
} from "@/lib/radar";

export type RadarItem = Blip & { n: number; active: boolean };
export type Camera = { fx: number; fy: number; z: number };

type Props = {
  items: RadarItem[];
  selectedId: string | null;
  hoveredId: string | null;
  camera: Camera; // target camera; the canvas eases toward it
  onSelect: (id: string) => void;
  onBackground: (ux: number, uy: number) => void;
  onHover: (id: string | null) => void;
};

type Hit = { id: string; x: number; y: number; r: number };

const VOID = "#08090c";

export function RadarCanvas({
  items,
  selectedId,
  hoveredId,
  camera,
  onSelect,
  onBackground,
  onHover,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({ items, selectedId, hoveredId, camera });
  stateRef.current = { items, selectedId, hoveredId, camera };

  const hitsRef = useRef<Hit[]>([]);
  const dimRef = useRef({ w: 0, h: 0 });
  const camCur = useRef<Camera>({ fx: 0, fy: 0, z: 1 });
  const viewRef = useRef({ cxE: 0, cyE: 0, Reff: 1, z: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let raf = 0;
    let sweep = -Math.PI / 2;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(240, Math.floor(rect.width));
      const h = Math.max(240, Math.floor(rect.height));
      dimRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const { w, h } = dimRef.current;
      if (!w || !h) return;
      const { items, selectedId, hoveredId, camera } = stateRef.current;

      // ease the camera toward its target (deceleration)
      const cam = camCur.current;
      cam.fx += (camera.fx - cam.fx) * (reduce ? 1 : 0.12);
      cam.fy += (camera.fy - cam.fy) * (reduce ? 1 : 0.12);
      cam.z += (camera.z - cam.z) * (reduce ? 1 : 0.1);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) / 2 - Math.max(56, Math.min(w, h) * 0.08);

      const Reff = R * cam.z;
      const cxE = cx - cam.fx * Reff;
      const cyE = cy + cam.fy * Reff;
      viewRef.current = { cxE, cyE, Reff, z: cam.z };

      ctx.clearRect(0, 0, w, h);

      // ring circles
      for (let i = 0; i < RINGS.length; i++) {
        ctx.beginPath();
        ctx.arc(cxE, cyE, RINGS[i].radius[1] * Reff, 0, Math.PI * 2);
        ctx.strokeStyle =
          i === RINGS.length - 1
            ? "rgba(230,240,255,0.20)"
            : "rgba(230,240,255,0.10)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // quadrant axes
      ctx.strokeStyle = "rgba(230,240,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cxE - Reff, cyE);
      ctx.lineTo(cxE + Reff, cyE);
      ctx.moveTo(cxE, cyE - Reff);
      ctx.lineTo(cxE, cyE + Reff);
      ctx.stroke();

      // rotating sweep line
      ctx.strokeStyle = "rgba(230,240,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cxE, cyE);
      ctx.lineTo(cxE + Math.cos(sweep) * Reff, cyE + Math.sin(sweep) * Reff);
      ctx.stroke();

      // ring labels
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "600 10px var(--font-mono, ui-monospace, monospace)";
      for (let i = 0; i < RINGS.length; i++) {
        const yr = cyE - ((RINGS[i].radius[0] + RINGS[i].radius[1]) / 2) * Reff;
        const label = RINGS[i].label.toUpperCase();
        const wlab = ctx.measureText(label).width + 12;
        ctx.fillStyle = "rgba(8,9,12,0.82)";
        ctx.fillRect(cxE - wlab / 2, yr - 8, wlab, 16);
        ctx.fillStyle = "rgba(152,160,173,0.9)";
        ctx.fillText(label, cxE, yr);
      }

      // quadrant labels (fade out as we zoom in — they'd fly off-screen)
      if (cam.z < 1.3) {
        ctx.font = "700 12px var(--font-sans, system-ui, sans-serif)";
        const pad = 8;
        const corners: Array<[number, number, CanvasTextAlign]> = [
          [cxE + Reff, cyE - Reff - pad, "right"],
          [cxE - Reff, cyE - Reff - pad, "left"],
          [cxE - Reff, cyE + Reff + pad + 12, "left"],
          [cxE + Reff, cyE + Reff + pad + 12, "right"],
        ];
        ctx.globalAlpha = Math.max(0, 1 - (cam.z - 1) / 0.3);
        QUADRANTS.forEach((q, i) => {
          const [x, y, align] = corners[i];
          ctx.textAlign = align;
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = q.color;
          ctx.fillText(q.label.toUpperCase(), x, y);
        });
        ctx.globalAlpha = 1;
      }

      const activeCount = items.reduce((n, b) => n + (b.active ? 1 : 0), 0);
      const showLabels = cam.z > 1.4 && activeCount <= 10;

      // blips
      const hits: Hit[] = [];
      for (const b of items) {
        const p = blipPosition(b);
        const x = cxE + p.x * Reff;
        const y = cyE - p.y * Reff;

        const color = QUADRANT_BY_SLUG[b.quadrant].color;
        const isSel = b.id === selectedId;
        const isHov = b.id === hoveredId;
        const emphasised = isSel || isHov;
        const grow = Math.min(1.35, 0.85 + 0.16 * cam.z);
        const r = (emphasised ? 12 : 9.5) * grow;
        hits.push({ id: b.id, x, y, r });

        if (!b.active) {
          ctx.beginPath();
          ctx.arc(x, y, 5 * grow, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(230,240,255,0.16)";
          ctx.lineWidth = 1;
          ctx.stroke();
          continue;
        }

        if (b.movement === "new") {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = VOID;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        if (emphasised) {
          ctx.beginPath();
          ctx.arc(x, y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = b.movement === "new" ? color : VOID;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 10px var(--font-mono, ui-monospace, monospace)";
        ctx.fillText(String(b.n), x, y + 0.5);

        // reveal name labels when zoomed (or when emphasised)
        if (showLabels || emphasised) {
          const tx = x + r + 7;
          ctx.font = "600 11px var(--font-sans, system-ui, sans-serif)";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const tw = ctx.measureText(b.name).width;
          ctx.fillStyle = "rgba(8,9,12,0.72)";
          ctx.fillRect(tx - 3, y - 8, tw + 6, 16);
          ctx.fillStyle = color;
          ctx.fillText(b.name, tx, y);
        }
      }
      hitsRef.current = hits;
    };

    const loop = () => {
      if (!reduce) sweep += 0.006;
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(wrap);

    if (reduce) draw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const localXY = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const pickHit = (mx: number, my: number): string | null => {
    let best: string | null = null;
    let bestD = Infinity;
    for (const hh of hitsRef.current) {
      const dx = hh.x - mx;
      const dy = hh.y - my;
      const d = dx * dx + dy * dy;
      const rr = (hh.r + 6) * (hh.r + 6);
      if (d < rr && d < bestD) {
        bestD = d;
        best = hh.id;
      }
    }
    return best;
  };

  return (
    <div ref={wrapRef} className="fixed inset-0 z-10">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onMouseMove={(e) => {
          const { x, y } = localXY(e.clientX, e.clientY);
          const id = pickHit(x, y);
          onHover(id);
          if (canvasRef.current) {
            canvasRef.current.style.cursor = id
              ? "pointer"
              : viewRef.current.z > 1.15
                ? "zoom-out"
                : "zoom-in";
          }
        }}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => {
          const { x, y } = localXY(e.clientX, e.clientY);
          const id = pickHit(x, y);
          if (id) {
            onSelect(id);
            return;
          }
          const v = viewRef.current;
          onBackground((x - v.cxE) / v.Reff, -(y - v.cyE) / v.Reff);
        }}
      />
    </div>
  );
}
