/*
 * Clock screen: twelve glass rods around a dark core on a grainy purple
 * field. The rod for the current hour is lit white; a string of glowing
 * dots inside the core sweeps round with the seconds and keeps changing
 * shape (arc, ring, spiral). The whole clock wobbles gently in 3D.
 */
window.ClockScreen = (() => {
  "use strict";

  const canvas = document.querySelector(".clock-canvas");
  const dateEl = document.querySelector(".clock-date");
  if (!canvas) return { start() {}, stop() {} };

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  let dpr = 1;
  let W = 0;
  let H = 0;
  let raf = 0;
  let timer = 0;
  let running = false;
  let t0 = 0;
  let grains = [];
  let lastDate = "";

  /* A few frames of grey noise, cycled to fake video grain. */
  const makeGrain = () => {
    grains = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement("canvas");
      c.width = c.height = 192;
      const g = c.getContext("2d");
      const img = g.createImageData(192, 192);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v * 0.95;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grains.push(ctx.createPattern(c, "repeat"));
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (!grains.length) makeGrain();
  };

  const pad = (n) => String(n).padStart(2, "0");

  const draw = (t) => {
    const now = new Date();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Background: dusky violet, darker at the edges, with grain. */
    const S = Math.min(W, H) * 0.92;
    const cx = W / 2;
    const cy = H / 2;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.6);
    bg.addColorStop(0, "#3a3170");
    bg.addColorStop(0.55, "#2c2559");
    bg.addColorStop(1, "#140f2c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* 3D wobble */
    const rx = reduceMotion ? 0.1 : 0.16 * Math.sin(t * 0.33) + 0.05 * Math.sin(t * 0.9);
    const ry = reduceMotion ? -0.12 : 0.2 * Math.sin(t * 0.27 + 1.1);
    const crx = Math.cos(rx);
    const srx = Math.sin(rx);
    const cry = Math.cos(ry);
    const sry = Math.sin(ry);
    const f = S * 2.6;
    const project = (x, y, z) => {
      const y1 = y * crx - z * srx;
      const z1 = y * srx + z * crx;
      const x2 = x * cry + z1 * sry;
      const z2 = -x * sry + z1 * cry;
      const s = f / (f + z2);
      return { x: cx + x2 * s, y: cy + y1 * s, s };
    };

    /* Dark core */
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.205);
    core.addColorStop(0, "rgba(4,3,12,0.97)");
    core.addColorStop(0.78, "rgba(6,5,18,0.9)");
    core.addColorStop(1, "rgba(6,5,18,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.205, 0, TAU);
    ctx.fill();

    /* Rods */
    const hour = now.getHours() % 12;
    const r1 = S * 0.235;
    const r2 = S * 0.465;
    const half = S * 0.03;
    const hueShift = reduceMotion ? 0 : Math.sin(t * 0.22);

    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const nx = -dy;
      const ny = dx;
      // Rods are slightly fatter towards the outside, like glass bars in perspective.
      const pts = [
        project(dx * r1 + nx * half * 0.9, dy * r1 + ny * half * 0.9, 0),
        project(dx * r2 + nx * half, dy * r2 + ny * half, 0),
        project(dx * r2 - nx * half, dy * r2 - ny * half, 0),
        project(dx * r1 - nx * half * 0.9, dy * r1 - ny * half * 0.9, 0),
      ];
      const lit = i === hour;

      ctx.beginPath();
      const corner = half * 0.35;
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.lineJoin = "round";

      // Cross-rod gradient: bright glass edges, deeper centre.
      const e1 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const e2 = { x: (pts[3].x + pts[2].x) / 2, y: (pts[3].y + pts[2].y) / 2 };
      const g = ctx.createLinearGradient(e1.x, e1.y, e2.x, e2.y);

      if (lit) {
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.5, "rgba(236,242,255,1)");
        g.addColorStop(1, "rgba(255,255,255,1)");
        ctx.shadowColor = "rgba(210,225,255,0.9)";
        ctx.shadowBlur = S * 0.03;
      } else {
        const hue = 205 + 22 * hueShift + 14 * Math.sin(i * 0.9 + t * 0.15);
        g.addColorStop(0, `hsla(${hue},85%,86%,0.95)`);
        g.addColorStop(0.16, `hsla(${hue},70%,66%,0.85)`);
        g.addColorStop(0.5, `hsla(${hue + 10},55%,42%,0.7)`);
        g.addColorStop(0.84, `hsla(${hue},70%,62%,0.82)`);
        g.addColorStop(1, `hsla(${hue},85%,82%,0.92)`);
        ctx.shadowColor = "rgba(120,170,255,0.35)";
        ctx.shadowBlur = S * 0.012;
      }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Glass edge highlight and a brighter outer end cap.
      ctx.lineWidth = Math.max(1, corner * 0.25);
      ctx.strokeStyle = lit ? "rgba(255,255,255,0.9)" : "rgba(200,225,255,0.45)";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineWidth = Math.max(1.5, half * 0.22);
      ctx.strokeStyle = lit ? "rgba(255,255,255,1)" : "rgba(225,240,255,0.7)";
      ctx.stroke();
    }

    /* Dots: a string of lights sweeping with the seconds, changing shape. */
    const secs = now.getSeconds() + now.getMilliseconds() / 1000;
    const head = (secs / 60) * TAU - Math.PI / 2;
    const N = 14;
    const span = reduceMotion ? Math.PI : Math.PI * (1.25 + 0.75 * Math.sin(t * 0.45));
    const spiral = reduceMotion ? 0 : 0.7 * Math.sin(t * 0.37 + 0.4);
    const wob = reduceMotion ? 0 : 0.18 * Math.sin(t * 0.8);
    const R0 = S * 0.112;

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const th = head - s * span;
      const r = R0 * (1 + spiral * (s - 0.5) + wob * Math.sin(3 * th + t));
      const p = project(Math.cos(th) * r, Math.sin(th) * r, 0);
      const size = S * 0.017 * p.s * (1 - s * 0.2);
      const dg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      dg.addColorStop(0, "rgba(255,255,255,1)");
      dg.addColorStop(0.25, "rgba(220,245,255,0.95)");
      dg.addColorStop(0.55, "rgba(120,200,255,0.35)");
      dg.addColorStop(1, "rgba(80,160,255,0)");
      ctx.fillStyle = dg;
      ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
    }

    /* Grain + scanlines */
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = grains[Math.floor(t * 14) % grains.length] || "#000";
    ctx.save();
    ctx.translate((Math.random() * 64) | 0, (Math.random() * 64) | 0);
    ctx.fillRect(-64, -64, W + 128, H + 128);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    /* Vignette */
    const v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.hypot(W, H) * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    /* Date + time, top-left */
    if (dateEl) {
      const txt = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}  ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      if (txt !== lastDate) {
        dateEl.textContent = txt;
        lastDate = txt;
      }
    }
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    draw((now - t0) / 1000);
  };

  const start = () => {
    if (running) return;
    running = true;
    resize();
    t0 = performance.now();
    if (reduceMotion) {
      draw(0);
      timer = setInterval(() => draw(0), 1000);
    } else {
      raf = requestAnimationFrame(loop);
    }
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    clearInterval(timer);
  };

  window.addEventListener("resize", () => {
    if (!running) return;
    resize();
    if (reduceMotion) draw(0);
  });

  document.addEventListener("visibilitychange", () => {
    if (!running || reduceMotion) return;
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  });

  return { start, stop };
})();
