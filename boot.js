/*
 * Boot sequence (three.js r128), two scenes on one canvas:
 *  1. Nebula: a cloud of blue light with a white shard at its heart,
 *     small tiles swirling around it, the title fading in, then the
 *     camera dives through and everything fades to black.
 *  2. Towers: a field of grainy grey cube columns pointing at the
 *     viewer, lit blue from a deep core, sliding in and out while
 *     the camera rolls and drifts forward.
 * Any key, click or tap skips it.
 */
window.Boot = (() => {
  "use strict";

  const root = document.getElementById("boot");
  const canvas = root && root.querySelector(".boot-canvas");
  const title = root && root.querySelector(".boot-title");
  const fade = root && root.querySelector(".boot-fade");

  const supported = () => {
    if (!root || !canvas || !window.THREE) return false;
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (_) {
      return false;
    }
  };

  /* Timeline (seconds) */
  const NEB_START = 0.25;
  const NEB_END = 3.75;
  const TOW_START = 4.05;
  const TOW_END = 7.6;
  const TOTAL = 7.9;

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInCubic = (x) => x * x * x;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* Seeded random so the composition is the same every visit */
  let seed = 1999;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  /* ---------- Procedural textures ---------- */
  const valueNoise = (size, cells) => {
    const grid = [];
    for (let i = 0; i < (cells + 1) * (cells + 1); i++) grid.push(rand());
    const at = (x, y) => grid[(y % (cells + 1)) * (cells + 1) + (x % (cells + 1))];
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const ix = Math.floor(gx);
        const iy = Math.floor(gy);
        let fx = gx - ix;
        let fy = gy - iy;
        fx = fx * fx * (3 - 2 * fx);
        fy = fy * fy * (3 - 2 * fy);
        const a = at(ix, iy);
        const b = at(ix + 1, iy);
        const c = at(ix, iy + 1);
        const d = at(ix + 1, iy + 1);
        out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      }
    }
    return out;
  };

  const cloudTexture = (THREE) => {
    const size = 256;
    const layers = [valueNoise(size, 4), valueNoise(size, 8), valueNoise(size, 16), valueNoise(size, 32)];
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let n = layers[0][i] * 0.5 + layers[1][i] * 0.27 + layers[2][i] * 0.15 + layers[3][i] * 0.08;
        const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
        const fall = Math.pow(clamp01(1 - d), 1.6);
        const a = clamp01((n - 0.32) * 2.1) * fall;
        img.data[i * 4] = 255;
        img.data[i * 4 + 1] = 255;
        img.data[i * 4 + 2] = 255;
        img.data[i * 4 + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  };

  const glowTexture = (THREE, inner, mid) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.22, mid);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  };

  /* Grainy grey cube face with dark seams, like the tower blocks */
  const cubeTexture = (THREE) => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        let v = 150 + rand() * 105;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        if (edge < 1) v *= 0.35;
        else if (edge < 3) v *= 0.75;
        img.data[i] = v * 0.95;
        img.data[i + 1] = v * 0.96;
        img.data[i + 2] = Math.min(255, v * 1.04);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  };

  /* ---------- Scene 1: nebula + tiles ---------- */
  const buildNebula = (THREE, small) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);

    // Cloud: overlapping noisy sprites in a few blues.
    const cloudTex = cloudTexture(THREE);
    const clouds = [];
    const cloudDefs = [
      [0, 0.55, -0.4, 6.2, 0x2747ff, 0.85],
      [-0.9, 0.75, -0.8, 4.6, 0x1f35d6, 0.7],
      [1.0, 0.45, -0.6, 4.8, 0x3a5cff, 0.65],
      [0.2, 1.05, -1.0, 5.2, 0x1a2bb0, 0.7],
      [-0.3, 0.25, -0.2, 3.4, 0x5d7dff, 0.55],
      [0.4, 0.7, -0.3, 2.6, 0x8ea6ff, 0.45],
    ];
    for (const [x, y, z, s, color, op] of cloudDefs) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTex,
          color,
          transparent: true,
          opacity: op,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      sp.position.set(x, y, z);
      sp.scale.set(s * 1.35, s * 1.05, 1);
      sp.material.rotation = rand() * Math.PI * 2;
      sp.userData = { spin: (rand() - 0.5) * 0.12, base: op };
      scene.add(sp);
      clouds.push(sp);
    }

    // Hot core glow + white shard.
    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(THREE, "rgba(255,255,255,1)", "rgba(140,170,255,0.6)"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreGlow.position.set(0, 0.5, 0);
    coreGlow.scale.set(1.3, 1.3, 1);
    scene.add(coreGlow);

    const shardShape = new THREE.Shape();
    shardShape.moveTo(-0.16, -0.1);
    shardShape.lineTo(0.17, -0.12);
    shardShape.lineTo(-0.05, 0.16);
    shardShape.closePath();
    const shard = new THREE.Mesh(
      new THREE.ShapeGeometry(shardShape),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    shard.position.set(0, 0.5, 0.05);
    scene.add(shard);

    // Tiles: thin squares scattered on a tilted disc around the core.
    const TILES = small ? 34 : 46;
    const tileGeo = new THREE.BoxGeometry(1, 1, 0.16);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0xe4e6ff,
      emissive: 0x1a2470,
      emissiveIntensity: 0.3,
      roughness: 0.45,
      metalness: 0.05,
    });
    const tiles = new THREE.InstancedMesh(tileGeo, tileMat, TILES);
    tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tileData = [];
    const col = new THREE.Color();
    for (let i = 0; i < TILES; i++) {
      const r = 0.55 + Math.pow(rand(), 1.15) * 2.9;
      const a = rand() * Math.PI * 2;
      tileData.push({
        r,
        a,
        h: (rand() - 0.5) * 0.55,
        size: 0.1 + rand() * 0.1,
        rx: rand() * Math.PI,
        ry: rand() * Math.PI,
        sx: (rand() - 0.5) * 0.8,
        sy: (rand() - 0.5) * 0.8,
        speed: 0.18 + 0.5 / (0.6 + r), // inner tiles orbit faster
      });
      const b = 0.35 + rand() * 0.65;
      col.setRGB(b * 0.86, b * 0.9, b);
      tiles.setColorAt(i, col);
    }
    const disc = new THREE.Group();
    disc.add(tiles);
    disc.position.set(0, 0.05, 0);
    disc.rotation.set(-1.22, 0, 0.18);
    scene.add(disc);

    // Lights
    scene.add(new THREE.AmbientLight(0x2a3a8a, 0.75));
    const core = new THREE.PointLight(0xaabbff, 2.4, 7, 1.5);
    core.position.set(0, 0.55, 0.2);
    scene.add(core);
    const front = new THREE.DirectionalLight(0xdfe6ff, 0.55);
    front.position.set(0.3, 1, 2);
    scene.add(front);

    const dummy = new THREE.Object3D();

    const update = (t, dur) => {
      const p = t / dur; // 0..1 through the scene

      // Clouds churn slowly and breathe.
      for (const c of clouds) {
        c.material.rotation += c.userData.spin * 0.016;
        c.material.opacity = c.userData.base * (0.85 + 0.15 * Math.sin(t * 1.4 + c.userData.spin * 40));
      }

      // Tiles swirl around the core.
      for (let i = 0; i < TILES; i++) {
        const d = tileData[i];
        const a = d.a + t * d.speed;
        dummy.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, d.h);
        dummy.rotation.set(d.rx + t * d.sx, d.ry + t * d.sy, a);
        dummy.scale.setScalar(d.size);
        dummy.updateMatrix();
        tiles.setMatrixAt(i, dummy.matrix);
      }
      tiles.instanceMatrix.needsUpdate = true;
      disc.rotation.z = 0.18 + t * 0.12;

      // Core shimmer.
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
      coreGlow.scale.setScalar(1.15 + pulse * 0.25 + Math.max(0, p - 0.75) * 6);
      shard.rotation.z = Math.sin(t * 0.9) * 0.25;
      shard.scale.setScalar(1 + Math.max(0, p - 0.8) * 4);

      // Camera: slow drift, then a dive through the core.
      const dive = easeInCubic(clamp01((p - 0.74) / 0.26));
      camera.position.set(
        Math.sin(t * 0.35) * 0.25,
        1.15 - dive * 0.6,
        5.4 - dive * 5.1
      );
      camera.lookAt(0, 0.3, 0);
    };

    return { scene, camera, update };
  };

  /* ---------- Scene 2: towers ---------- */
  const buildTowers = (THREE, small) => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.052);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);

    const G = small ? 11 : 13;
    const half = (G - 1) / 2;
    const cols = [];
    let count = 0;
    for (let gx = 0; gx < G; gx++) {
      for (let gy = 0; gy < G; gy++) {
        const x = gx - half;
        const y = gy - half;
        const d = Math.hypot(x, y);
        if (d < 1.2) continue; // hollow core where the light shines through
        if (rand() < 0.1) continue;
        const len = 4 + Math.floor(rand() * 9);
        cols.push({
          x: x * 1.24,
          y: y * 1.24,
          len,
          // outer columns reach closer to the viewer: a tunnel
          front: -11 + d * 1.25 + rand() * 2.6,
          amp: 0.4 + rand() * 1.8,
          speed: 0.6 + rand() * 1.2,
          phase: rand() * Math.PI * 2,
          delay: rand() * 0.6,
          start: count,
        });
        count += len;
      }
    }

    const geo = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe4e6ec,
      map: cubeTexture(THREE),
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0x22252f, 0.8));
    const key = new THREE.DirectionalLight(0xf0f2ff, 1.05);
    key.position.set(-0.6, 0.8, 1.4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8bccb, 0.38);
    fill.position.set(0.9, -0.6, 0.5);
    scene.add(fill);
    const blue = new THREE.PointLight(0x3359ff, 2.6, 11, 2);
    blue.position.set(0, 0, -12);
    scene.add(blue);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(THREE, "rgba(170,195,255,1)", "rgba(40,80,255,0.55)"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.set(0, 0, -14);
    glow.scale.set(9, 9, 1);
    scene.add(glow);

    // Little red / green / blue lights, as in the original footage.
    const SP = 14;
    const spPos = new Float32Array(SP * 3);
    const spCol = new Float32Array(SP * 3);
    const palette = [[1, 0.15, 0.15], [0.2, 1, 0.35], [0.5, 0.55, 1]];
    for (let i = 0; i < SP; i++) {
      spPos.set([(rand() - 0.5) * 4, (rand() - 0.5) * 4, -3 - rand() * 8], i * 3);
      spCol.set(palette[i % 3], i * 3);
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
    scene.add(
      new THREE.Points(
        spGeo,
        new THREE.PointsMaterial({
          size: 0.12,
          map: glowTexture(THREE, "rgba(255,255,255,1)", "rgba(255,255,255,0.4)"),
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    const dummy = new THREE.Object3D();

    const update = (t, dur) => {
      const p = t / dur;
      for (const c of cols) {
        // Columns push in towards the viewer at the start, then keep sliding.
        const rise = easeOutCubic(clamp01((t - c.delay) / 1.6));
        const z = c.front + Math.sin(t * c.speed + c.phase) * c.amp - (1 - rise) * 9;
        for (let k = 0; k < c.len; k++) {
          dummy.position.set(c.x, c.y, z - k);
          dummy.updateMatrix();
          mesh.setMatrixAt(c.start + k, dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;

      glow.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.4);

      const e = easeInOut(clamp01(p));
      camera.position.set(Math.sin(t * 0.5) * 0.35, Math.cos(t * 0.4) * 0.25, 6.5 - e * 2.6);
      camera.lookAt(0, 0, -14);
      camera.rotateZ(-0.42 + e * 0.5);
    };

    return { scene, camera, update };
  };

  /* ---------- Runner ---------- */
  const start = (onDone) => {
    const THREE = window.THREE;
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch (_) {
      onDone();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 1);

    const nebula = buildNebula(THREE, small);
    const towers = buildTowers(THREE, small);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      for (const s of [nebula, towers]) {
        s.camera.aspect = w / h;
        // Keep the composition framed on portrait screens too.
        s.camera.fov = w / h < 1 ? 70 : s === nebula ? 48 : 60;
        s.camera.updateProjectionMatrix();
      }
    };
    resize();
    window.addEventListener("resize", resize);

    root.hidden = false;
    let finished = false;
    let raf = 0;
    let titleOn = false;
    let titleOff = false;
    const t0 = performance.now();
    let endAt = Infinity; // set when skipping

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      removeSkip();
      renderer.dispose();
      root.hidden = true;
      onDone();
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      let black = 1;

      if (t >= NEB_START && t < NEB_END) {
        const lt = t - NEB_START;
        const dur = NEB_END - NEB_START;
        nebula.update(lt, dur);
        renderer.render(nebula.scene, nebula.camera);
        black = Math.max(1 - clamp01(lt / 0.6), clamp01((lt - (dur - 0.45)) / 0.45));
        if (!titleOn && lt > 0.75) {
          title.classList.add("is-on");
          titleOn = true;
        }
        if (!titleOff && lt > 2.5) {
          title.classList.add("is-off");
          titleOff = true;
        }
      } else if (t >= TOW_START && t < TOW_END) {
        const lt = t - TOW_START;
        const dur = TOW_END - TOW_START;
        towers.update(lt, dur);
        renderer.render(towers.scene, towers.camera);
        black = Math.max(1 - clamp01(lt / 0.5), clamp01((lt - (dur - 0.6)) / 0.6));
      } else {
        renderer.clear();
      }

      // Skipping: fade to black quickly, then finish.
      if (endAt !== Infinity) black = Math.max(black, clamp01((now - endAt) / 350));
      fade.style.opacity = String(black);

      if (t > TOTAL || now - endAt > 380) finish();
    };

    const skip = () => {
      if (endAt === Infinity) endAt = performance.now();
    };
    const onKey = (e) => {
      if (e.key === "Shift" || e.key === "Tab") return;
      e.preventDefault();
      skip();
    };
    const removeSkip = () => {
      window.removeEventListener("keydown", onKey, true);
      root.removeEventListener("pointerdown", skip);
    };
    window.addEventListener("keydown", onKey, true);
    root.addEventListener("pointerdown", skip);

    raf = requestAnimationFrame(frame);
  };

  return { supported, start };
})();
