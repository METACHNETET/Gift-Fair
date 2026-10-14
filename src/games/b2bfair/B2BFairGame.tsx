import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Scoped styles (ported from the standalone HTML prototype, prefixed under .b2b-game so nothing leaks to other fairs/pages while this route is mounted) ───
const GAME_STYLES = `
.b2b-game, .b2b-game * { box-sizing: border-box; }
.b2b-game {
  color-scheme: dark;
  --ink: #0a1222;
  --panel: #101b31;
  --line: rgba(212, 175, 95, 0.26);
  --gold: #d4af5f;
  --gold-hi: #f1d896;
  --text: #ebe6da;
  --muted: #9ba7bd;
  --ok: #8fd3a8;
  --display: "Frank Ruhl Libre", "David", "Times New Roman", serif;
  --body: "Assistant", "Segoe UI", Arial, sans-serif;
  background: var(--ink);
  color: var(--text);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.55;
  direction: rtl;
  min-height: 100vh;
}
.b2b-game .wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding-inline: 16px;
  padding-block: 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.b2b-game header { display: flex; flex-direction: column; gap: 6px; }
.b2b-game .eyebrow { font-size: 13px; letter-spacing: 0.12em; color: var(--gold); font-weight: 600; }
.b2b-game h1 {
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(34px, 6vw, 56px);
  line-height: 1.05;
  margin: 0;
  color: var(--gold-hi);
  text-wrap: balance;
}
.b2b-game header p { margin: 0; color: var(--muted); max-width: 62ch; }

.b2b-game .stage { border: 1px solid var(--line); background: var(--panel); padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.b2b-game .hud { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; padding-inline: 4px; }
.b2b-game .keys { display: flex; gap: 8px; align-items: center; }
.b2b-game .keys span.lbl { color: var(--muted); font-size: 14px; margin-inline-end: 4px; }
.b2b-game .slot {
  width: 30px; height: 30px;
  border: 1px solid var(--line);
  display: grid; place-items: center;
  color: rgba(212,175,95,.25);
  transition: color .25s, border-color .25s, background .25s;
}
.b2b-game .slot.got { color: var(--gold-hi); border-color: var(--gold); background: rgba(212,175,95,.12); }
.b2b-game .slot svg { width: 18px; height: 18px; }
.b2b-game .floor-label { font-family: var(--display); font-size: 18px; color: var(--gold-hi); }
.b2b-game .hint { color: var(--muted); font-size: 14px; }
.b2b-game kbd { font-family: var(--body); border: 1px solid var(--line); padding: 0 6px; font-size: 13px; color: var(--text); }

.b2b-game .screen { position: relative; width: 100%; aspect-ratio: 16 / 9; max-width: 100%; background: #000; }
.b2b-game canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.b2b-game .overlay {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  background: rgba(8, 14, 28, 0.72);
  text-align: center;
  padding: 16px;
}
.b2b-game .overlay .card { display: flex; flex-direction: column; gap: 12px; align-items: center; max-width: 36ch; }
.b2b-game .overlay h2 { font-family: var(--display); color: var(--gold-hi); font-size: clamp(24px, 4vw, 40px); margin: 0; line-height: 1.1; }
.b2b-game .overlay p { margin: 0; color: var(--text); }

.b2b-game button, .b2b-game .file {
  font-family: var(--body);
  font-size: 15px;
  font-weight: 600;
  background: transparent;
  color: var(--gold-hi);
  border: 1px solid var(--gold);
  padding: 8px 18px;
  cursor: pointer;
}
.b2b-game button.primary { background: var(--gold); color: var(--ink); }
.b2b-game button:hover, .b2b-game .file:hover { background: rgba(212,175,95,.14); }
.b2b-game button.primary:hover { background: var(--gold-hi); }
.b2b-game button:focus-visible, .b2b-game .file:focus-within, .b2b-game input:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 2px; }

.b2b-game .pad { display: none; gap: 8px; justify-content: space-between; flex-wrap: wrap; }
.b2b-game .pad .grp { display: flex; gap: 8px; }
.b2b-game .pad button { min-width: 56px; min-height: 48px; font-size: 18px; user-select: none; -webkit-user-select: none; }
@media (pointer: coarse) { .b2b-game .pad { display: flex; } .b2b-game .hint.kb { display: none; } }

.b2b-game .bench { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.b2b-game .box { border: 1px solid var(--line); padding: 18px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.b2b-game .box h3 { font-family: var(--display); font-weight: 500; font-size: 22px; margin: 0; color: var(--gold-hi); }
.b2b-game .box p { margin: 0; color: var(--muted); font-size: 15px; }
.b2b-game .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.b2b-game .file { display: inline-flex; align-items: center; gap: 8px; }
.b2b-game .file input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.b2b-game label.chk { display: inline-flex; gap: 8px; align-items: center; font-size: 15px; cursor: pointer; }
.b2b-game .num { display: inline-flex; gap: 6px; align-items: center; font-size: 15px; }
.b2b-game .num input { width: 56px; background: var(--ink); color: var(--text); border: 1px solid var(--line); padding: 4px 6px; font-family: var(--body); font-variant-numeric: tabular-nums; }
.b2b-game .status { font-size: 14px; color: var(--ok); min-height: 1.4em; }
.b2b-game .status.warn { color: var(--gold-hi); }
.b2b-game .sliders { display: grid; gap: 10px; }
.b2b-game .sl { display: grid; grid-template-columns: 9.5em 1fr 3.2em; gap: 10px; align-items: center; font-size: 14px; }
.b2b-game .sl output { font-variant-numeric: tabular-nums; color: var(--muted); text-align: left; }
.b2b-game input[type=range] { width: 100%; accent-color: var(--gold); }
@media (prefers-reduced-motion: reduce) { .b2b-game .slot { transition: none; } }

.b2b-game .back-btn { position: fixed; top: 16px; inset-inline-end: 16px; z-index: 50; border-radius: 999px; }
`;

export default function B2BFairGame() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let active = true;
    let rafId = 0;

    const byId = <T extends HTMLElement = HTMLElement>(id: string): T => root.querySelector("#" + id) as T;

    const W = 1280, H = 720;
    const cv = byId<HTMLCanvasElement>("game");
    const ctx = cv.getContext("2d")!;

    /* ---------- level config ---------- */
    const DEFAULTS = { floors: [698, 470, 242], ladders: [1080, 200] };
    let cfg = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const s = localStorage.getItem("kfitza-cfg");
      if (s) cfg = Object.assign(cfg, JSON.parse(s));
    } catch (e) {}
    const saveCfg = () => {
      try {
        localStorage.setItem("kfitza-cfg", JSON.stringify(cfg));
      } catch (e) {}
    };

    const FLOOR_NAMES = ["קומת קרקע", "קומה 1", "קומה 2"];
    const KEY_X = [560, 760, 640];

    /* ---------- helpers ---------- */
    function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    }
    function goldGrad(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "#f6dc94"); g.addColorStop(0.5, "#d2a64e"); g.addColorStop(1, "#9c7428");
      return g;
    }
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    /* ---------- drawn college background ---------- */
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = W; bgCanvas.height = H;
    function drawCollege() {
      const c = bgCanvas.getContext("2d")!;
      seed = 7;
      const f = cfg.floors, SLAB = 20;
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0b1426"); sky.addColorStop(1, "#16233d");
      c.fillStyle = sky; c.fillRect(0, 0, W, H);

      for (let i = 0; i < 3; i++) {
        const top = i === 2 ? 26 : f[i + 1] + SLAB;
        const bottom = f[i];
        const hh = bottom - top;
        if (hh < 40) continue;
        const wall = c.createLinearGradient(0, top, 0, bottom);
        wall.addColorStop(0, "#16274a"); wall.addColorStop(1, "#1d3159");
        c.fillStyle = wall; c.fillRect(0, top, W, hh);
        const wy = bottom - hh * 0.3;
        const wood = c.createLinearGradient(0, wy, 0, bottom);
        wood.addColorStop(0, "#4a2f1c"); wood.addColorStop(1, "#2c1a0f");
        c.fillStyle = wood; c.fillRect(0, wy, W, bottom - wy);
        for (let x = 20; x < W; x += 90) {
          c.strokeStyle = "rgba(212,175,95,.22)"; c.lineWidth = 1.5;
          c.strokeRect(x, wy + 10, 70, bottom - wy - 20);
        }
        c.fillStyle = goldGrad(c, 0, wy - 3, 0, wy + 3); c.fillRect(0, wy - 3, W, 5);

        const colW = 26, bay = 213;
        for (let b = 0; b < 6; b++) {
          const bx = b * bay + colW;
          const bw = bay - colW;
          const kind = (b + i) % 3;
          const ay = top + 18, ah = wy - top - 30;
          if (ah < 30) continue;
          if (kind === 0) {
            const cx = bx + bw / 2, ww = bw * 0.55;
            c.save();
            c.beginPath();
            c.moveTo(cx - ww / 2, ay + ah); c.lineTo(cx - ww / 2, ay + ww / 2);
            c.arc(cx, ay + ww / 2, ww / 2, Math.PI, 0); c.lineTo(cx + ww / 2, ay + ah); c.closePath();
            const gl = c.createLinearGradient(0, ay, 0, ay + ah);
            gl.addColorStop(0, "#3b5f93"); gl.addColorStop(1, "#22406d");
            c.fillStyle = gl; c.fill();
            c.lineWidth = 4; c.strokeStyle = "#c9a14e"; c.stroke();
            c.clip();
            c.strokeStyle = "rgba(212,175,95,.55)"; c.lineWidth = 2;
            c.beginPath(); c.moveTo(cx, ay); c.lineTo(cx, ay + ah); c.stroke();
            for (let y = ay + ww / 2 + 20; y < ay + ah; y += 34) { c.beginPath(); c.moveTo(cx - ww / 2, y); c.lineTo(cx + ww / 2, y); c.stroke(); }
            c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(cx - ww / 2, ay, ww * 0.35, ah);
            c.restore();
          } else if (kind === 1) {
            const sx = bx + 18, sw = bw - 36;
            c.fillStyle = "#2a1a10"; c.fillRect(sx, ay, sw, ah);
            c.strokeStyle = "#c9a14e"; c.lineWidth = 3; c.strokeRect(sx, ay, sw, ah);
            const shelves = Math.max(2, Math.floor(ah / 38));
            const sh = ah / shelves;
            const pal = ["#6b1f2a", "#1f3a5f", "#2e4a35", "#7a5a2a", "#3b2b4f", "#8a6d3b"];
            for (let s = 0; s < shelves; s++) {
              const yb = ay + (s + 1) * sh;
              c.fillStyle = "#5a3a20"; c.fillRect(sx, yb - 4, sw, 4);
              let x = sx + 6;
              while (x < sx + sw - 10) {
                const w = 6 + rnd() * 8, h = sh * (0.55 + rnd() * 0.32);
                c.fillStyle = pal[Math.floor(rnd() * pal.length)];
                c.fillRect(x, yb - 4 - h, w, h);
                c.fillStyle = "rgba(241,216,150,.5)"; c.fillRect(x, yb - 4 - h * 0.7, w, 1.5);
                x += w + 1.5;
              }
            }
          } else {
            const ox = bx + 12, ow = bw - 24;
            c.fillStyle = "rgba(120,170,220,.12)"; c.fillRect(ox, ay, ow, ah);
            c.strokeStyle = "rgba(212,175,95,.7)"; c.lineWidth = 2; c.strokeRect(ox, ay, ow, ah);
            c.beginPath(); c.moveTo(ox + ow / 2, ay); c.lineTo(ox + ow / 2, ay + ah); c.stroke();
            const dy = ay + ah - 26;
            c.fillStyle = "#3d2716"; c.fillRect(ox + 20, dy, ow - 40, 8);
            c.fillRect(ox + 26, dy + 8, 5, 18); c.fillRect(ox + ow - 31, dy + 8, 5, 18);
            c.fillStyle = "#0d1729"; c.fillRect(ox + ow / 2 - 18, dy - 22, 36, 20);
            c.fillStyle = "rgba(127,214,255,.35)"; c.fillRect(ox + ow / 2 - 15, dy - 19, 30, 14);
            c.fillStyle = "rgba(255,255,255,.07)";
            c.beginPath(); c.moveTo(ox + 10, ay); c.lineTo(ox + 40, ay); c.lineTo(ox + 10, ay + 60); c.closePath(); c.fill();
          }
        }
        for (let b = 0; b <= 6; b++) {
          const x = b * bay;
          const cg = c.createLinearGradient(x, 0, x + colW, 0);
          cg.addColorStop(0, "#b9b2a3"); cg.addColorStop(0.45, "#efe9dc"); cg.addColorStop(1, "#9d968a");
          c.fillStyle = cg; c.fillRect(x, top + 10, colW, hh - 10);
          c.fillStyle = "rgba(0,0,0,.12)";
          for (let k = 5; k < colW; k += 6) c.fillRect(x + k, top + 22, 1.5, hh - 34);
          c.fillStyle = goldGrad(c, 0, top, 0, top + 12); c.fillRect(x - 5, top, colW + 10, 12);
          c.fillStyle = goldGrad(c, 0, bottom - 10, 0, bottom); c.fillRect(x - 5, bottom - 10, colW + 10, 10);
        }
        for (let k = 0; k < 2; k++) {
          const cx = k === 0 ? 320 + i * 40 : 900 - i * 40, cy = top + 30;
          const glow = c.createRadialGradient(cx, cy + 10, 2, cx, cy + 10, 90);
          glow.addColorStop(0, "rgba(255,224,150,.35)"); glow.addColorStop(1, "rgba(255,224,150,0)");
          c.fillStyle = glow; c.fillRect(cx - 90, cy - 80, 180, 180);
          c.strokeStyle = "#c9a14e"; c.lineWidth = 2;
          c.beginPath(); c.moveTo(cx, top); c.lineTo(cx, cy); c.stroke();
          c.beginPath(); c.ellipse(cx, cy + 6, 30, 8, 0, 0, Math.PI); c.stroke();
          for (let a = -2; a <= 2; a++) {
            c.fillStyle = "#fff3cf";
            c.beginPath(); c.arc(cx + a * 14, cy + 2 - Math.abs(a) * 2, 2.6, 0, Math.PI * 2); c.fill();
          }
        }
        c.fillStyle = "rgba(8,14,28,.55)"; c.fillRect(W - 150, top + 14, 128, 30);
        c.strokeStyle = "#c9a14e"; c.lineWidth = 1.5; c.strokeRect(W - 150, top + 14, 128, 30);
        c.fillStyle = "#f1d896"; c.font = '600 17px "Frank Ruhl Libre", serif'; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(FLOOR_NAMES[i], W - 86, top + 30);
      }

      for (let i = 0; i < 3; i++) {
        const y = f[i];
        const h = i === 0 ? H - y : SLAB;
        const m = c.createLinearGradient(0, y, 0, y + h);
        m.addColorStop(0, "#ece6da"); m.addColorStop(1, "#c4bcad");
        c.fillStyle = m; c.fillRect(0, y, W, h);
        c.strokeStyle = "rgba(120,110,95,.35)"; c.lineWidth = 1;
        for (let v = 0; v < 14; v++) {
          let x = rnd() * W; c.beginPath(); c.moveTo(x, y + 2);
          for (let s = 0; s < 6; s++) { x += 10 + rnd() * 30; c.lineTo(x, y + 2 + rnd() * (h - 4)); }
          c.stroke();
        }
        c.fillStyle = goldGrad(c, 0, y, 0, y + 4); c.fillRect(0, y, W, 4);
        if (i > 0) { c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, y + h, W, 6); }
      }
      c.fillStyle = "#0d1830"; c.fillRect(0, 0, W, 26);
      c.fillStyle = goldGrad(c, 0, 20, 0, 26); c.fillRect(0, 20, W, 6);
      c.fillStyle = "#f1d896"; c.font = '700 15px "Frank Ruhl Libre", serif'; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("המכללה לעסקים · יריד B2B", W / 2, 11);
    }

    /* ---------- assets ---------- */
    let bgImg: HTMLImageElement | null = null;
    let sprites: { walk: any[]; climb: any[]; refH: number } | null = null;

    /* ---------- player ---------- */
    const P: any = {};
    const keys = [{ got: false, x: 0 }, { got: false, x: 0 }, { got: false, x: 0 }];
    function reset() {
      Object.assign(P, { x: 110, y: cfg.floors[0], vy: 0, floor: 0, ground: true, climbing: false, ladder: -1, dir: 1, phase: 0, anim: 0, moving: false });
      keys.forEach((k, i) => { k.got = false; k.x = KEY_X[i]; });
      sparks.length = 0;
      updateHud();
    }
    const sparks: any[] = [];

    /* ---------- input ---------- */
    const inp = { left: false, right: false, up: false, down: false, jump: false };
    let jumpLatch = false;
    const KEYMAP: Record<string, keyof typeof inp> = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "jump" };

    function onKeyDown(e: KeyboardEvent) {
      const k = KEYMAP[e.code]; if (!k) return;
      if (document.activeElement && document.activeElement.tagName === "INPUT" && (document.activeElement as HTMLInputElement).type !== "checkbox") return;
      e.preventDefault(); inp[k] = true; begin();
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = KEYMAP[e.code]; if (k) inp[k] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const padCleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLButtonElement>(".pad button").forEach((b) => {
      const k = b.dataset.k as keyof typeof inp;
      const on = (e: Event) => { e.preventDefault(); inp[k] = true; begin(); };
      const off = (e: Event) => { e.preventDefault(); inp[k] = false; };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
      padCleanups.push(() => {
        b.removeEventListener("pointerdown", on);
        b.removeEventListener("pointerup", off); b.removeEventListener("pointerleave", off); b.removeEventListener("pointercancel", off);
      });
    });

    /* ---------- game flow ---------- */
    let running = false;
    const startOv = byId("startOverlay");
    const winOv = byId("winOverlay");
    function begin() { if (!running && winOv.hidden) { running = true; startOv.hidden = true; cv.focus({ preventScroll: true }); } }
    const startBtn = byId<HTMLButtonElement>("startBtn");
    const againBtn = byId<HTMLButtonElement>("againBtn");
    startBtn.onclick = begin;
    againBtn.onclick = () => { reset(); winOv.hidden = true; running = true; cv.focus({ preventScroll: true }); };

    function updateHud() {
      keys.forEach((k, i) => byId("slot" + i).classList.toggle("got", k.got));
      byId("floorLabel").textContent = P.climbing ? "על הסולם" : FLOOR_NAMES[P.floor];
    }

    /* ---------- physics ---------- */
    const SPEED = 270, GRAV = 1900, JUMP = 640, CLIMB = 190, NEAR = 28;
    function ladderSpan(i: number) { return { x: cfg.ladders[i], bottom: i, top: i + 1 }; }

    function step(dt: number) {
      const f = cfg.floors;
      const dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      P.moving = false;

      if (P.climbing) {
        const L = ladderSpan(P.ladder);
        P.x += (L.x - P.x) * Math.min(1, dt * 18);
        if (dy) { P.y += dy * CLIMB * dt; P.moving = true; P.anim += dt; }
        if (P.y <= f[L.top]) { P.y = f[L.top]; P.climbing = false; P.floor = L.top; P.ground = true; }
        else if (P.y >= f[L.bottom]) { P.y = f[L.bottom]; P.climbing = false; P.floor = L.bottom; P.ground = true; }
      } else {
        if (dx) { P.dir = dx; P.x += dx * SPEED * dt; P.moving = true; }
        P.x = Math.max(26, Math.min(W - 26, P.x));
        if (P.ground) {
          for (let i = 0; i < 2; i++) {
            const L = ladderSpan(i);
            if (Math.abs(P.x - L.x) > NEAR) continue;
            if (P.floor === L.bottom && inp.up) { P.climbing = true; P.ladder = i; P.ground = false; break; }
            if (P.floor === L.top && inp.down) { P.climbing = true; P.ladder = i; P.ground = false; P.y = f[L.top] + 4; break; }
          }
          if (!P.climbing && inp.jump && !jumpLatch) { P.vy = -JUMP; P.ground = false; }
        }
        if (!P.ground && !P.climbing) {
          const prev = P.y;
          P.vy += GRAV * dt; P.y += P.vy * dt;
          if (P.vy > 0) {
            for (let i = 2; i >= 0; i--) {
              if (prev <= f[i] + 0.5 && P.y >= f[i]) { P.y = f[i]; P.vy = 0; P.ground = true; P.floor = i; break; }
            }
            if (P.y > f[0]) { P.y = f[0]; P.vy = 0; P.ground = true; P.floor = 0; }
          }
        }
        if (P.moving) P.anim += dt;
      }
      jumpLatch = inp.jump;
      P.phase = P.anim * 11;

      keys.forEach((k, i) => {
        if (k.got) return;
        const ky = f[i] - 46;
        if (Math.abs(P.x - k.x) < 34 && ky > P.y - 100 && ky < P.y + 6) {
          k.got = true;
          for (let s = 0; s < 22; s++) {
            const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 200;
            sparks.push({ x: k.x, y: ky, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.8 + Math.random() * 0.4 });
          }
          if (keys.every((q) => q.got)) setTimeout(() => { running = false; winOv.hidden = false; }, 650);
        }
      });
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.life -= dt; s.vy += 500 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      updateHud();
    }

    /* ---------- drawing ---------- */
    function drawLadder(c: CanvasRenderingContext2D, i: number) {
      const L = ladderSpan(i), f = cfg.floors;
      const yb = f[L.bottom], yt = f[L.top] - 34, x = L.x, w = 38;
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x - w / 2 - 6, f[L.top], w + 12, 20);
      c.lineCap = "round";
      c.strokeStyle = "#7a5a20"; c.lineWidth = 4;
      for (let y = yb - 14; y > yt + 6; y -= 22) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.stroke(); }
      c.strokeStyle = goldGrad(c, x - w / 2, 0, x + w / 2, 0); c.lineWidth = 6;
      c.beginPath(); c.moveTo(x - w / 2, yb); c.lineTo(x - w / 2, yt); c.moveTo(x + w / 2, yb); c.lineTo(x + w / 2, yt); c.stroke();
      c.strokeStyle = "#f1d896"; c.lineWidth = 3;
      for (let y = yb - 14; y > yt + 6; y -= 22) { c.beginPath(); c.moveTo(x - w / 2 + 3, y - 1); c.lineTo(x + w / 2 - 3, y - 1); c.stroke(); }
    }

    function drawKey(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
      const by = y + Math.sin(t * 2.4 + x) * 5;
      const g = c.createRadialGradient(x, by, 2, x, by, 46);
      g.addColorStop(0, "rgba(255,220,130,.55)"); g.addColorStop(1, "rgba(255,220,130,0)");
      c.fillStyle = g; c.fillRect(x - 46, by - 46, 92, 92);
      c.save(); c.translate(x, by); c.rotate(-0.35);
      c.strokeStyle = goldGrad(c, -20, -10, 20, 10); c.lineWidth = 5; c.lineCap = "round";
      c.beginPath(); c.arc(-11, 0, 8, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(-3, 0); c.lineTo(20, 0); c.moveTo(13, 0); c.lineTo(13, 7); c.moveTo(19, 0); c.lineTo(19, 6); c.stroke();
      c.restore();
    }

    function limb(c: CanvasRenderingContext2D, px: number, py: number, ang: number, len: number, wdt: number, fill: string) {
      c.save(); c.translate(px, py); c.rotate(ang);
      rr(c, -wdt / 2, 0, wdt, len, wdt / 2); c.fillStyle = fill; c.fill();
      c.restore();
    }

    function drawRobot(c: CanvasRenderingContext2D, x: number, y: number, dir: number, mode: string, ph: number) {
      c.save(); c.translate(x, y);
      c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(0, 1, 20, 4, 0, 0, Math.PI * 2); c.fill();
      if (mode !== "climb" && dir < 0) c.scale(-1, 1);
      const navy = "#14213c", navyD = "#0c162b";
      const sw = mode === "walk" ? Math.sin(ph) * 0.55 : 0;
      const bob = mode === "walk" ? -Math.abs(Math.sin(ph)) * 2.5 : 0;
      c.translate(0, bob);

      if (mode === "climb") {
        const o = Math.sin(ph) * 5;
        limb(c, -7, -32, 0, 26 + o * 0.4, 10, navyD); limb(c, 7, -32, 0, 26 - o * 0.4, 10, navyD);
        c.fillStyle = goldGrad(c, -12, 0, 12, 0); c.fillRect(-12, -6 + o * 0.4, 10, 5); c.fillRect(2, -6 - o * 0.4, 10, 5);
        limb(c, -15, -60, Math.PI - 0.25, 26 + o, 9, navy); limb(c, 15, -60, Math.PI + 0.25, 26 - o, 9, navy);
        rr(c, -16, -66, 32, 38, 9); c.fillStyle = goldGrad(c, -16, -66, 16, -28); c.fill();
        c.fillStyle = navyD; rr(c, -8, -58, 16, 22, 3); c.fill();
        c.strokeStyle = "rgba(241,216,150,.6)"; c.lineWidth = 1;
        for (let k = -54; k < -38; k += 5) { c.beginPath(); c.moveTo(-5, k); c.lineTo(5, k); c.stroke(); }
        rr(c, -15, -92, 30, 25, 9); c.fillStyle = navy; c.fill(); c.strokeStyle = "#d4af5f"; c.lineWidth = 2; c.stroke();
      } else {
        const legA = mode === "jump" ? 0.5 : sw;
        limb(c, -2, -32, -legA, 28, 10, navyD);
        c.save(); c.translate(-2, -32); c.rotate(-legA); c.fillStyle = goldGrad(c, -6, 26, 10, 32); rr(c, -6, 25, 16, 6, 3); c.fill(); c.restore();
        limb(c, 0, -60, sw * 0.8, 25, 8, navyD);
        rr(c, -16, -66, 32, 38, 9); c.fillStyle = goldGrad(c, -16, -66, 16, -28); c.fill();
        c.strokeStyle = "rgba(80,55,15,.55)"; c.lineWidth = 1; c.stroke();
        c.fillStyle = navy; rr(c, -8, -58, 18, 15, 3); c.fill();
        c.strokeStyle = "#f1d896"; c.lineWidth = 1.2; c.beginPath(); c.arc(1, -50.5, 4, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(1, -50.5); c.lineTo(1, -53.5); c.moveTo(1, -50.5); c.lineTo(3, -50.5); c.stroke();
        limb(c, 3, -32, legA, 28, 10, navy);
        c.save(); c.translate(3, -32); c.rotate(legA); c.fillStyle = goldGrad(c, -6, 26, 10, 32); rr(c, -6, 25, 17, 6, 3); c.fill(); c.restore();
        rr(c, -15, -93, 30, 26, 9); c.fillStyle = navy; c.fill(); c.strokeStyle = "#d4af5f"; c.lineWidth = 2; c.stroke();
        rr(c, -4, -86, 17, 11, 5); c.fillStyle = "#081022"; c.fill();
        c.save(); c.shadowColor = "#7fd6ff"; c.shadowBlur = 10; c.fillStyle = "#9fe2ff";
        c.beginPath(); c.arc(1.5, -80.5, 2.6, 0, Math.PI * 2); c.arc(8.5, -80.5, 2.6, 0, Math.PI * 2); c.fill(); c.restore();
        limb(c, 0, -60, -sw * 0.8, 25, 8, navy);
        c.fillStyle = "#d4af5f"; c.beginPath(); c.arc(0, -60, 4.5, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = "#d4af5f"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -93); c.lineTo(0, -101); c.stroke();
      c.save(); c.shadowColor = "#ffe39a"; c.shadowBlur = 8; c.fillStyle = "#f6dc94"; c.beginPath(); c.arc(0, -103, 3.4, 0, Math.PI * 2); c.fill(); c.restore();
      c.restore();
    }

    function drawSpriteRobot(c: CanvasRenderingContext2D, x: number, y: number, dir: number, mode: string) {
      const set = mode === "climb" && sprites!.climb.length ? sprites!.climb : sprites!.walk;
      let idx = 0;
      if (mode === "walk" || mode === "climb") idx = Math.floor(P.anim * (mode === "climb" ? 6 : 9)) % set.length;
      if (mode === "jump") idx = Math.min(2, set.length - 1);
      const fr = set[idx];
      const scale = 104 / sprites!.refH;
      const w = fr.w * scale, h = fr.h * scale;
      c.save(); c.translate(x, y);
      c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(0, 1, 104 * 0.2, 4, 0, 0, Math.PI * 2); c.fill();
      if (mode !== "climb" && dir < 0) c.scale(-1, 1);
      c.drawImage(fr.cv, -fr.ax * scale, -h, w, h);
      c.restore();
    }

    let t0 = performance.now(), clock = 0;
    function frame(now: number) {
      if (!active) return;
      const dt = Math.min(0.033, (now - t0) / 1000); t0 = now; clock += dt;
      if (running) step(dt);

      ctx.clearRect(0, 0, W, H);
      if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H); else ctx.drawImage(bgCanvas, 0, 0);
      if (byId<HTMLInputElement>("drawLadders").checked) { drawLadder(ctx, 0); drawLadder(ctx, 1); }
      keys.forEach((k, i) => { if (!k.got) drawKey(ctx, k.x, cfg.floors[i] - 46, clock); });

      const mode = P.climbing ? "climb" : (!P.ground ? "jump" : (P.moving ? "walk" : "idle"));
      if (sprites) drawSpriteRobot(ctx, P.x, P.y, P.dir, mode);
      else drawRobot(ctx, P.x, P.y, P.dir, mode, P.phase);

      sparks.forEach((s) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
        ctx.fillStyle = "#f6dc94"; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      if (byId<HTMLInputElement>("showGuides").checked) {
        ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
        ctx.strokeStyle = "#7fd6ff";
        cfg.floors.forEach((y: number, i: number) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.fillStyle = "#7fd6ff"; ctx.font = "600 16px Assistant, sans-serif"; ctx.textAlign = "left"; ctx.fillText(FLOOR_NAMES[i], 10, y - 8); });
        ctx.strokeStyle = "#ff9d7a";
        cfg.ladders.forEach((x: number, i: number) => { ctx.beginPath(); ctx.moveTo(x, cfg.floors[i]); ctx.lineTo(x, cfg.floors[i + 1] - 30); ctx.stroke(); });
        ctx.restore();
      }
      rafId = requestAnimationFrame(frame);
    }

    /* ---------- sprite sheet processing ---------- */
    const statusEl = byId("sheetStatus");
    let lastSheet: HTMLImageElement | null = null;
    function setStatus(msg: string, warn?: boolean) { statusEl.textContent = msg; statusEl.classList.toggle("warn", !!warn); }

    function buildFrames(img: HTMLImageElement) {
      const counts = [+byId<HTMLInputElement>("walkN").value || 8, +byId<HTMLInputElement>("climbN").value || 4];
      const keyWhite = byId<HTMLInputElement>("keyWhite").checked;
      const w = img.naturalWidth, h = img.naturalHeight;
      const s = document.createElement("canvas"); s.width = w; s.height = h;
      const sc = s.getContext("2d", { willReadFrequently: true })!;
      sc.drawImage(img, 0, 0);
      const data = sc.getImageData(0, 0, w, h); const a = data.data;
      if (keyWhite) {
        for (let i = 0; i < a.length; i += 4) {
          const mn = Math.min(a[i], a[i + 1], a[i + 2]), mx = Math.max(a[i], a[i + 1], a[i + 2]);
          if (mx - mn < 22) {
            if (mn > 236) a[i + 3] = 0;
            else if (mn > 212) a[i + 3] = Math.min(a[i + 3], Math.round((255 * (236 - mn)) / 24));
          }
        }
        sc.putImageData(data, 0, 0);
      }
      const alphaAt = (x: number, y: number) => a[(y * w + x) * 4 + 3];
      const out: any[] = []; const notes: string[] = [];
      for (let r = 0; r < counts.length; r++) {
        const y0 = Math.round((r * h) / counts.length), y1 = Math.round(((r + 1) * h) / counts.length);
        const col = new Uint16Array(w);
        for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (alphaAt(x, y) > 40) col[x]++;
        let segs: number[][] = []; let start = -1;
        for (let x = 0; x <= w; x++) {
          const on = x < w && col[x] > 2;
          if (on && start < 0) start = x;
          if (!on && start >= 0) { segs.push([start, x]); start = -1; }
        }
        const gap = Math.max(4, w * 0.004);
        segs = segs.reduce((m: number[][], sg) => { if (m.length && sg[0] - m[m.length - 1][1] <= gap) m[m.length - 1][1] = sg[1]; else m.push(sg); return m; }, []);
        segs = segs.filter((sg) => sg[1] - sg[0] > w * 0.012);
        if (segs.length !== counts[r]) {
          notes.push(r === 0 ? "הליכה" : "טיפוס");
          segs = []; for (let k = 0; k < counts[r]; k++) segs.push([Math.round((k * w) / counts[r]), Math.round(((k + 1) * w) / counts[r])]);
        }
        const frames = segs.map(([x0, x1]) => {
          let top = y1, bot = y0, left = x1, right = x0;
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (alphaAt(x, y) > 40) {
            if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x;
          }
          if (bot <= top) { top = y0; bot = y1 - 1; left = x0; right = x1 - 1; }
          const fw = right - left + 1, fh = bot - top + 1;
          let sx = 0, n = 0;
          const yEnd = top + Math.round(fh * 0.45);
          for (let y = top; y < yEnd; y++) for (let x = left; x <= right; x++) if (alphaAt(x, y) > 40) { sx += x; n++; }
          const ax = n ? sx / n - left : fw / 2;
          const f = document.createElement("canvas"); f.width = fw; f.height = fh;
          f.getContext("2d")!.drawImage(s, left, top, fw, fh, 0, 0, fw, fh);
          return { cv: f, w: fw, h: fh, ax };
        });
        const med = frames.map((q) => q.h).sort((p, q) => p - q)[Math.floor(frames.length / 2)] || 1;
        const clean = frames.filter((q) => q.h > med * 0.75 && q.h < med * 1.3);
        out.push(clean.length ? clean : frames);
      }
      const hs = out[0].map((f: any) => f.h).sort((p: number, q: number) => p - q);
      sprites = { walk: out[0], climb: out[1] || [], refH: hs[Math.floor(hs.length / 2)] || 100 };
      if (notes.length) setStatus("לא זוהו מרווחים ברורים בשורת ה" + notes.join(" ושורת ה") + ", ולכן היא חולקה לתאים שווים. אם הדמות קופצת, בדקו את מספר הפריימים.", true);
      else setStatus("הגיליון נטען: " + sprites.walk.length + " פריימי הליכה ו-" + sprites.climb.length + " פריימי טיפוס.");
    }

    function loadFile(input: HTMLInputElement, cb: (img: HTMLImageElement) => void) {
      const handler = () => {
        const file = input.files && input.files[0]; if (!file) return;
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { cb(img); URL.revokeObjectURL(url); };
        img.onerror = () => setStatus("לא הצלחתי לפתוח את הקובץ. נסו קובץ PNG או JPG.", true);
        img.src = url;
        input.value = "";
      };
      input.addEventListener("change", handler);
      return () => input.removeEventListener("change", handler);
    }
    const bgFileEl = byId<HTMLInputElement>("bgFile");
    const sheetFileEl = byId<HTMLInputElement>("sheetFile");
    const cleanupBgFile = loadFile(bgFileEl, (img) => { bgImg = img; byId<HTMLInputElement>("showGuides").checked = true; setStatus("הרקע נטען. הזיזו את קווי העזר לרצפות ולסולמות בתמונה."); });
    const cleanupSheetFile = loadFile(sheetFileEl, (img) => { lastSheet = img; buildFrames(img); });

    const sheetDepChangeHandler = () => { if (lastSheet) buildFrames(lastSheet); };
    ["walkN", "climbN", "keyWhite"].forEach((id) => byId(id).addEventListener("change", sheetDepChangeHandler));

    const useDrawnRobotBtn = byId<HTMLButtonElement>("useDrawnRobot");
    const useDrawnBgBtn = byId<HTMLButtonElement>("useDrawnBg");
    useDrawnRobotBtn.onclick = () => { sprites = null; setStatus("חזרה לרובוט המצויר."); };
    useDrawnBgBtn.onclick = () => { bgImg = null; setStatus("חזרה לרקע המצויר."); };

    /* ---------- calibration ---------- */
    const SL: Array<[string, () => number, (v: number) => void]> = [
      ["f0", () => cfg.floors[0], (v) => (cfg.floors[0] = v)],
      ["f1", () => cfg.floors[1], (v) => (cfg.floors[1] = v)],
      ["f2", () => cfg.floors[2], (v) => (cfg.floors[2] = v)],
      ["l0", () => cfg.ladders[0], (v) => (cfg.ladders[0] = v)],
      ["l1", () => cfg.ladders[1], (v) => (cfg.ladders[1] = v)],
    ];
    function syncSliders() {
      SL.forEach(([id, get]) => {
        (byId(id) as HTMLInputElement).value = String(get());
        byId(id + "o").textContent = String(Math.round(get()));
      });
    }
    const sliderHandlers = SL.map(([id, get, set]) => {
      const handler = (e: Event) => {
        set(+(e.target as HTMLInputElement).value);
        cfg.floors[1] = Math.min(cfg.floors[1], cfg.floors[0] - 60);
        cfg.floors[2] = Math.min(cfg.floors[2], cfg.floors[1] - 60);
        byId(id + "o").textContent = String(Math.round(get()));
        drawCollege(); saveCfg();
        if (P.ground && !P.climbing) P.y = cfg.floors[P.floor];
      };
      byId(id).addEventListener("input", handler);
      return { id, handler };
    });
    const resetCalBtn = byId<HTMLButtonElement>("resetCal");
    resetCalBtn.onclick = () => { cfg = JSON.parse(JSON.stringify(DEFAULTS)); saveCfg(); syncSliders(); drawCollege(); reset(); };

    /* ---------- boot ---------- */
    syncSliders();
    drawCollege();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCollege);
    reset();
    rafId = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      padCleanups.forEach((fn) => fn());
      cleanupBgFile(); cleanupSheetFile();
      ["walkN", "climbN", "keyWhite"].forEach((id) => byId(id).removeEventListener("change", sheetDepChangeHandler));
      sliderHandlers.forEach(({ id, handler }) => byId(id).removeEventListener("input", handler));
    };
  }, []);

  return (
    <div className="b2b-game" ref={rootRef} dir="rtl">
      <style>{GAME_STYLES}</style>

      <button className="back-btn" onClick={() => navigate("/")}>← ירידים</button>

      <div className="wrap">
        <header>
          <span className="eyebrow">יריד העסקים · שלב ראשון</span>
          <h1>קפיצה עסקית</h1>
          <p>הרובוט מטפס בין שלוש קומות המכללה ואוסף מפתח בכל קומה. כל מפתח יכול להוביל לדוכן של עסק ביריד.</p>
        </header>

        <section className="stage" aria-label="אזור המשחק">
          <div className="hud">
            <div className="keys" aria-live="polite">
              <span className="lbl">מפתחות</span>
              <span className="slot" id="slot0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><circle cx="7" cy="12" r="4.5" /><path d="M11.5 12H22M18 12v4M21 12v3" /></svg></span>
              <span className="slot" id="slot1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><circle cx="7" cy="12" r="4.5" /><path d="M11.5 12H22M18 12v4M21 12v3" /></svg></span>
              <span className="slot" id="slot2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><circle cx="7" cy="12" r="4.5" /><path d="M11.5 12H22M18 12v4M21 12v3" /></svg></span>
            </div>
            <span className="floor-label" id="floorLabel">קומת קרקע</span>
            <span className="hint kb">תזוזה <kbd>←</kbd> <kbd>→</kbd> · סולם <kbd>↑</kbd> <kbd>↓</kbd> · קפיצה <kbd>רווח</kbd></span>
          </div>

          <div className="screen">
            <canvas id="game" width={1280} height={720} tabIndex={0} aria-label="משחק קפיצה עסקית"></canvas>
            <div className="overlay" id="startOverlay">
              <div className="card">
                <h2>קפיצה עסקית</h2>
                <p>אספו את שלושת המפתחות. הסולמות מחברים בין הקומות.</p>
                <button className="primary" id="startBtn">התחלה</button>
              </div>
            </div>
            <div className="overlay" id="winOverlay" hidden>
              <div className="card">
                <h2>שלושת המפתחות נאספו</h2>
                <p>כאן תיפתח הדלת לדוכני העסקים של היריד.</p>
                <button className="primary" id="againBtn">משחק חוזר</button>
              </div>
            </div>
          </div>

          <div className="pad" aria-label="מקשי שליטה">
            <div className="grp">
              <button data-k="right" aria-label="ימינה">→</button>
              <button data-k="left" aria-label="שמאלה">←</button>
            </div>
            <div className="grp">
              <button data-k="up" aria-label="למעלה">↑</button>
              <button data-k="down" aria-label="למטה">↓</button>
              <button data-k="jump">קפיצה</button>
            </div>
          </div>
        </section>

        <section className="bench">
          <div className="box">
            <h3>הגרפיקה מפריפיק</h3>
            <p>בברירת המחדל המכללה והרובוט מצוירים בקוד. טענו את התמונות שהורדתם ממגניפיק, והמשחק ישתמש בהן במקום.</p>
            <div className="row">
              <label className="file">רקע המכללה<input type="file" id="bgFile" accept="image/*" /></label>
              <label className="file">גיליון פריימים<input type="file" id="sheetFile" accept="image/*" /></label>
            </div>
            <div className="row">
              <span className="num">הליכה <input type="number" id="walkN" min={1} max={16} defaultValue={8} /> פריימים</span>
              <span className="num">טיפוס <input type="number" id="climbN" min={1} max={16} defaultValue={4} /> פריימים</span>
            </div>
            <div className="row">
              <label className="chk"><input type="checkbox" id="keyWhite" defaultChecked /> הסרת רקע לבן מהגיליון</label>
            </div>
            <div className="status" id="sheetStatus"></div>
            <div className="row">
              <button id="useDrawnRobot">רובוט מצויר</button>
              <button id="useDrawnBg">רקע מצויר</button>
            </div>
          </div>

          <div className="box">
            <h3>כיול קומות וסולמות</h3>
            <p>אחרי טעינת רקע, הזיזו את הקווים כך שיישבו על רצפות הקומות ועל הסולמות בתמונה.</p>
            <div className="row">
              <label className="chk"><input type="checkbox" id="showGuides" /> הצגת קווי עזר</label>
              <label className="chk"><input type="checkbox" id="drawLadders" defaultChecked /> ציור סולמות</label>
            </div>
            <div className="sliders">
              <div className="sl"><label htmlFor="f0">רצפת קומת קרקע</label><input type="range" id="f0" min={200} max={715} /><output id="f0o"></output></div>
              <div className="sl"><label htmlFor="f1">רצפת קומה 1</label><input type="range" id="f1" min={100} max={680} /><output id="f1o"></output></div>
              <div className="sl"><label htmlFor="f2">רצפת קומה 2</label><input type="range" id="f2" min={60} max={600} /><output id="f2o"></output></div>
              <div className="sl"><label htmlFor="l0">סולם תחתון</label><input type="range" id="l0" min={40} max={1240} /><output id="l0o"></output></div>
              <div className="sl"><label htmlFor="l1">סולם עליון</label><input type="range" id="l1" min={40} max={1240} /><output id="l1o"></output></div>
            </div>
            <div className="row"><button id="resetCal">איפוס כיול</button></div>
          </div>
        </section>
      </div>
    </div>
  );
}
