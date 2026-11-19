/*
 * Menu orbs: seven glowing blue orbs on a ring that spins in 3D.
 * The ring swings edge-on (collapsing into a line) and the orbs slide
 * along it at uneven speeds, so they bunch into pairs and threes and
 * then spread out again. Faint light trails fall below each orb.
 */
window.Orbs = (() => {
  "use strict";

  const canvas = document.querySelector(".orbs-canvas");
  const anchor = document.querySelector(".orb-anchor");
  if (!canvas || !anchor) return { start() {}, setLevel() {} };

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const N = 7;
  const TAU = Math.PI * 2;

  let dpr = 1;
  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let sprite = null;
  let spriteSize = 0;
  let raf = 0;
  let running = false;
  let level = 0;
  let introStart = 0;
  let t0 = 0;

  /* Pre-rendered orb: white-hot core, cyan halo, soft blue falloff. */
  const makeSprite = (radius) => {
    const s = Math.max(8, Math.ceil(radius * 2 * dpr));
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    const h = s / 2;
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.08, "rgba(236,252,255,1)");
    grad.addColorStop(0.16, "rgba(170,232,255,0.95)");
    grad.addColorStop(0.3, "rgba(70,180,255,0.55)");
    grad.addColorStop(0.55, "rgba(25,120,255,0.18)");
    grad.addColorStop(1, "rgba(10,60,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    sprite = c;
    spriteSize = s;
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const r = anchor.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    R = r.width / 2;
    makeSprite(R * 0.36);
    if (!running) draw(reduceMotion ? 0 : (performance.now() - t0) / 1000);
  };

  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

  const draw = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!sprite) return;

    // Intro: the ring grows out of the centre and brightens.
    const intro = reduceMotion ? 1 : easeOutCubic(Math.min((performance.now() - introStart) / 1400, 1));

    // Ring orientation: yaw passes edge-on (±90°) now and then, pitch tips it.
    const yaw = 1.2 * Math.sin(t * 0.47) + 0.42 * Math.sin(t * 1.13 + 0.6);
    const pitch = 0.85 * Math.sin(t * 0.36 + 1.3) + 0.25 * Math.sin(t * 0.91);
    const spin = t * 0.95;
    // Bunching: orbs slide along the ring at uneven speeds.
    const bunch = 0.3 * (0.5 + 0.5 * Math.sin(t * 0.58 - 0.8));

    const cyaw = Math.cos(yaw);
    const syaw = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const f = R * 11; // perspective distance (weak, so the ring keeps its shape)

    const orbs = [];
    for (let i = 0; i < N; i++) {
      const base = (TAU * i) / N;
      const a = spin + base + bunch * Math.sin(3 * base + t * 0.45);
      let x = Math.cos(a) * R * intro;
      let y = Math.sin(a) * R * intro;
      let z = 0;
      // pitch (around X)
      const y1 = y * cp - z * sp;
      const z1 = y * sp + z * cp;
      // yaw (around Y)
      const x2 = x * cyaw + z1 * syaw;
      const z2 = -x * syaw + z1 * cyaw;
      const s = f / (f - z2);
      orbs.push({ x: cx + x2 * s, y: cy + y1 * s, z: z2, s });
    }
    orbs.sort((p, q) => p.z - q.z);

    ctx.globalCompositeOperation = "lighter";

    // Faint vertical light trails under each orb.
    const trail = H * 0.24;
    for (const o of orbs) {
      const g = ctx.createLinearGradient(0, o.y, 0, o.y + trail);
      g.addColorStop(0, `rgba(60,150,255,${0.1 * intro})`);
      g.addColorStop(1, "rgba(60,150,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(o.x - 0.75, o.y, 1.5, trail);
    }

    // Orbs, back to front; nearer ones a little larger and brighter.
    for (const o of orbs) {
      const depth = Math.max(-1, Math.min(1, o.z / R));
      const size = (spriteSize / dpr) * o.s * (0.95 + 0.05 * depth);
      ctx.globalAlpha = Math.min(1, (0.88 + 0.12 * depth) * intro);
      ctx.drawImage(sprite, o.x - size / 2, o.y - size / 2, size, size);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    draw((now - t0) / 1000);
  };

  const start = () => {
    if (running) return;
    running = true;
    t0 = performance.now();
    introStart = t0;
    resize();
    if (reduceMotion) {
      running = false;
      draw(0);
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  /* level: 1 = full, 0.2 = dimmed behind a dialog, 0 = hidden */
  const setLevel = (l) => {
    level = l;
    canvas.style.opacity = String(l);
    if (l > 0) {
      if (!running && !reduceMotion) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    } else {
      // Stop drawing once the fade-out has finished.
      setTimeout(() => {
        if (level === 0) stop();
      }, 650);
    }
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) raf = requestAnimationFrame(loop);
  });

  return { start, setLevel, resize };
})();
