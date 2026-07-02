"use client";

import { useEffect, useRef } from "react";

type Ping = { x: number; y: number; t: number };

/**
 * The background reads like a radar panning over terrain.
 *
 * A pixel "landscape" (value-noise heightfield) parallax-pans with inertia as
 * you move the cursor, and a targeting **sight** glides after the cursor with
 * deceleration. Clicks emit a radar ping. Flat black & white, no depth.
 * Purely decorative (`pointer-events-none`); renders one static frame under
 * `prefers-reduced-motion`.
 */
export function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const spacing = 30;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;

    /* ---- pre-baked toroidal heightfield (terrain) ---- */
    const N = 128;
    const field = new Float32Array(N * N);
    {
      const rnd = (x: number, y: number) => {
        let hsh = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
        hsh = Math.imul(hsh ^ (hsh >>> 13), 1274126177);
        return ((hsh ^ (hsh >>> 16)) >>> 0) / 4294967295;
      };
      const smooth = (t: number) => t * t * (3 - 2 * t);
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      // toroidal value noise: lattice wraps at `period` so the field tiles.
      const vnoise = (x: number, y: number, period: number) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        const wx = (n: number) => ((n % period) + period) % period;
        const tl = rnd(wx(xi), wx(yi));
        const tr = rnd(wx(xi + 1), wx(yi));
        const bl = rnd(wx(xi), wx(yi + 1));
        const br = rnd(wx(xi + 1), wx(yi + 1));
        const u = smooth(xf);
        const v = smooth(yf);
        return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
      };
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          let amp = 1;
          let freq = 1;
          let sum = 0;
          let norm = 0;
          for (let o = 0; o < 4; o++) {
            const base = 8 * freq; // lattice cells across the field
            sum += vnoise((i / N) * base, (j / N) * base, base) * amp;
            norm += amp;
            amp *= 0.5;
            freq *= 2;
          }
          let hgt = sum / norm;
          hgt = Math.pow(hgt, 1.5); // sharpen peaks → landmasses
          field[i * N + j] = hgt;
        }
      }
    }
    const heightAt = (cx: number, cy: number) =>
      field[(((cx % N) + N) % N) * N + (((cy % N) + N) % N)];

    /* ---- interaction state ---- */
    const cursor = { x: -9999, y: -9999, active: false };
    const world = { x: 0, y: 0 }; // eased terrain offset (px)
    const pings: Ping[] = [];

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / spacing) + 3;
      rows = Math.ceil(h / spacing) + 3;
    };

    const CURSOR_R = 150;

    const drawTerrain = (now: number) => {
      const baseShiftX = ((world.x % spacing) + spacing) % spacing;
      const baseShiftY = ((world.y % spacing) + spacing) % spacing;
      const offCol = Math.floor(world.x / spacing);
      const offRow = Math.floor(world.y / spacing);

      for (let c = -1; c < cols; c++) {
        const sx = c * spacing - baseShiftX;
        for (let r = -1; r < rows; r++) {
          const sy = r * spacing - baseShiftY;
          const hgt = heightAt(c + offCol, r + offRow);
          if (hgt < 0.12) continue; // sea level — sparse

          // subtle reactive energy: cursor proximity + expanding click waves
          let energy = 0;
          if (cursor.active) {
            const dx = sx - cursor.x;
            const dy = sy - cursor.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < CURSOR_R * CURSOR_R) {
              energy += (1 - Math.sqrt(d2) / CURSOR_R) * 0.5;
            }
          }
          for (const p of pings) {
            const age = (now - p.t) / 1000;
            if (age < 0) continue;
            const radius = age * 480;
            const d = Math.hypot(sx - p.x, sy - p.y);
            const band = 70;
            const dd = Math.abs(d - radius);
            if (dd < band) {
              energy += (1 - dd / band) * Math.max(0, 1 - age / 2.4) * 0.55;
            }
          }

          const bright = Math.min(1.5, hgt + energy);
          const a = Math.min(0.6, 0.03 + bright * 0.34);
          const s = Math.max(1, Math.round(1 + bright * 2.4));
          ctx.fillStyle = `rgba(190,205,225,${a})`;
          ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
        }
      }
    };

    const applyMask = () => {
      // gradient mask — mesh is present in a soft centre and fades to the edges
      const cx = w / 2;
      const cy = h / 2;
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(w, h) * 0.05,
        cx,
        cy,
        Math.max(w, h) * 0.62,
      );
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.68, "rgba(0,0,0,0.72)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      // retire finished click waves
      for (let i = pings.length - 1; i >= 0; i--) {
        if ((now - pings[i].t) / 1000 > 2.4) pings.splice(i, 1);
      }

      // parallax the terrain opposite the cursor, with inertia
      const tx = cursor.active ? -(cursor.x - w / 2) * 0.22 : 0;
      const ty = cursor.active ? -(cursor.y - h / 2) * 0.22 : 0;
      world.x += (tx - world.x) * 0.05;
      world.y += (ty - world.y) * 0.05;

      ctx.clearRect(0, 0, w, h);
      drawTerrain(now);
      applyMask();
    };

    let raf = 0;
    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.active = true;
    };
    const onLeave = () => {
      cursor.active = false;
    };
    const onDown = (e: PointerEvent) => {
      pings.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pings.length > 6) pings.shift();
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduce) {
      frame(0);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-0 h-full w-full"
    />
  );
}
