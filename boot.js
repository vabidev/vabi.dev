/*
 * Boot sequence (three.js r128), modelled on the console's disc-boot intro:
 *  0.0s  a cluster of long square rods on a dark grey field, all pointing
 *        at the viewer, lit cool white with a blue glow deep inside, a few
 *        faceted "crystal" clumps at the corners, slowly rolling closer;
 *        a name fades in over it and out again
 *  7.3s  the camera accelerates and dives into a gap between the rods,
 *        blurring and darkening
 *  8.8s  empty dark grey
 * 10.0s  the logo forms out of violet streaks into crisp white, holds,
 *        then everything fades into the menu
 * Any key, click or tap skips it.
 */
window.Boot = (() => {
  "use strict";

  const root = document.getElementById("boot");
  const canvas = root && root.querySelector(".boot-canvas");
  const title = root && root.querySelector(".boot-title");
  const fade = root && root.querySelector(".boot-fade");
  const logo = root && root.querySelector(".boot-logo");

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
  const TITLE_IN = 0.5;
  const TITLE_OUT = 2.65;
  const DIVE_START = 7.3;
  const DIVE_END = 8.8;
  const LOGO_FORM = 10.0;
  const LOGO_OUT = 12.3;
  const LEAVE = 12.7;
  const TOTAL = 13.25;

  const BG = 0x181818; // the intro's dark grey, not black

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const easeInCubic = (x) => x * x * x;
  const lerp = (a, b, k) => a + (b - a) * k;

  /* Seeded random so the composition is the same every visit */
  let seed = 2000;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  /* ---------- Textures ---------- */
  const grainTexture = (THREE) => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        let v = 218 + rand() * 37;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        if (edge < 2) v *= 0.82; // soft darker rim on each face
        img.data[i] = v * 0.93;
        img.data[i + 1] = v * 0.95;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
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
    grad.addColorStop(0.3, mid);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  };

  /* ---------- Scene ---------- */
  const buildScene = (THREE) => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 3.5, 15);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);

    const material = new THREE.MeshStandardMaterial({
      color: 0xd4d6e4,
      map: grainTexture(THREE),
      roughness: 0.92,
      metalness: 0.04,
    });

    /* Rods: a ragged, roughly oval block of long square bars pointing at
       the viewer, with dark gaps between them. */
    const rods = [];
    for (let gx = -6; gx <= 6; gx++) {
      for (let gy = -4; gy <= 4; gy++) {
        // squarish outline (superellipse) with a ragged edge
        const e = Math.abs(gx / 6.7) ** 3 + Math.abs(gy / 4.7) ** 3;
        if (e > 1.1) continue;
        if (e > 0.6 && rand() < (e - 0.6) * 1.5) continue;
        if (rand() < 0.06) continue; // a few holes
        const poke = rand() < 0.07 ? 1.4 + rand() * 1.2 : 0; // a few stick far out
        const sink = rand() < 0.08 ? -3.5 : 0; // a few sit deep, leaving dark holes
        rods.push({
          x: gx,
          y: gy,
          front: -rand() * 2 + poke + sink,
          len: 7 + rand() * 9,
          amp: 0.15 + rand() * 0.35,
          speed: 0.35 + rand() * 0.6,
          phase: rand() * Math.PI * 2,
          shade: 1 - 0.32 * Math.min(1, e), // outer rods a little darker
        });
      }
    }

    const rodMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, rods.length);
    rodMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const col = new THREE.Color();
    rods.forEach((r, i) => {
      const b = (0.86 + rand() * 0.14) * r.shade;
      col.setRGB(b, b, b);
      rodMesh.setColorAt(i, col);
    });
    scene.add(rodMesh);

    /* Faceted crystal clumps floating near the corners. */
    const crystals = [];
    const crystalMat = material.clone();
    crystalMat.flatShading = true;
    const makeCrystal = (x, y, z, s) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 0), crystalMat));
      for (let i = 0; i < 9; i++) {
        const geo =
          i % 3 === 0
            ? new THREE.TetrahedronGeometry(0.38 * s, 0)
            : new THREE.BoxGeometry(0.42 * s, 0.42 * s, 0.42 * s);
        const m = new THREE.Mesh(geo, crystalMat);
        const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        m.position.copy(dir.multiplyScalar(0.55 * s));
        m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        g.add(m);
      }
      g.position.set(x, y, z);
      g.userData = { sx: (rand() - 0.5) * 0.5, sy: 0.15 + rand() * 0.3 };
      scene.add(g);
      crystals.push(g);
    };
    makeCrystal(-5.0, 3.2, 0.8, 1.05);
    makeCrystal(4.9, 3.5, 0.4, 1.15);
    makeCrystal(-5.0, -3.3, 1.0, 0.95);

    /* Lights: cool key from the front-left, dim blue fill, blue core. */
    scene.add(new THREE.AmbientLight(0x2c2f3c, 0.45));
    const key = new THREE.DirectionalLight(0xf2f3ff, 1.3);
    key.position.set(-0.55, 0.65, 1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8a90a8, 0.35);
    fill.position.set(0.7, -0.5, 0.4);
    scene.add(fill);
    const core = new THREE.PointLight(0x4b62ff, 1.5, 7, 2);
    core.position.set(0.4, 0.3, -3.5);
    scene.add(core);

    // Blue glow deep in the middle, seen through the gaps.
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(THREE, "rgba(150,170,255,1)", "rgba(60,80,255,0.5)"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.set(0.4, 0.3, -6);
    glow.scale.set(11, 11, 1);
    scene.add(glow);

    // Faint blue haze over the middle of the cluster.
    const haze = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(THREE, "rgba(120,140,255,0.9)", "rgba(70,90,255,0.45)"),
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      })
    );
    haze.position.set(0.3, 0.4, 1.2);
    haze.scale.set(6.5, 6.5, 1);
    scene.add(haze);

    // Tiny red and green lights drifting through the middle.
    const SP = 6;
    const spPos = new Float32Array(SP * 3);
    const spCol = new Float32Array(SP * 3);
    const specks = [];
    for (let i = 0; i < SP; i++) {
      specks.push({ x: (rand() - 0.5) * 6, y: (rand() - 0.5) * 4, z: -1 - rand() * 3, v: 0.3 + rand() * 0.6 });
      spCol.set(i % 2 ? [1, 0.2, 0.2] : [0.3, 1, 0.4], i * 3);
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
    scene.add(
      new THREE.Points(
        spGeo,
        new THREE.PointsMaterial({
          size: 0.16,
          map: glowTexture(THREE, "rgba(255,255,255,1)", "rgba(255,255,255,0.35)"),
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    const dummy = new THREE.Object3D();

    const update = (t) => {
      // Rods slide very slightly, like they're breathing.
      rods.forEach((r, i) => {
        const front = r.front + Math.sin(t * r.speed + r.phase) * r.amp;
        dummy.position.set(r.x, r.y, front - r.len / 2);
        dummy.scale.set(0.84, 0.84, r.len);
        dummy.updateMatrix();
        rodMesh.setMatrixAt(i, dummy.matrix);
      });
      rodMesh.instanceMatrix.needsUpdate = true;

      for (const c of crystals) {
        c.rotation.x += c.userData.sx * 0.016;
        c.rotation.y += c.userData.sy * 0.016;
      }

      specks.forEach((s, i) => {
        spPos[i * 3] = s.x + Math.sin(t * s.v + i) * 1.5;
        spPos[i * 3 + 1] = s.y;
        spPos[i * 3 + 2] = s.z;
      });
      spGeo.attributes.position.needsUpdate = true;

      glow.material.opacity = 0.32 + 0.1 * Math.sin(t * 1.7);

      // Camera: slow roll and push-in, then a dive down a gap between rods.
      const p = Math.pow(clamp01(t / DIVE_START), 1.6); // gentle push-in that builds up
      const q = easeInCubic(clamp01((t - DIVE_START) / (DIVE_END - DIVE_START)));
      const x = lerp(lerp(0.35, 0.2, p), -0.3, q);
      const y = lerp(lerp(0.25, 0.1, p), -0.2, q);
      const z = lerp(9.0, 7.2, p) - q * 6.4;
      camera.position.set(x, y, z);
      camera.lookAt(x * 0.3, y * 0.3, z - 30);
      camera.rotateZ(-0.14 - 0.2 * p - 0.5 * q);
    };

    return { scene, camera, update };
  };

  /* ---------- Runner ---------- */
  const start = (onDone) => {
    const THREE = window.THREE;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch (_) {
      onDone();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(BG, 1);

    const intro = buildScene(THREE);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      intro.camera.aspect = w / h;
      intro.camera.fov = w / h < 1 ? 90 : 60; // keep the cluster framed on phones
      intro.camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    root.hidden = false;
    let finished = false;
    let raf = 0;
    const flags = {};
    const once = (name, fn) => {
      if (!flags[name]) {
        flags[name] = true;
        fn();
      }
    };
    const t0 = performance.now();
    let skipAt = Infinity;

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
      let cover = 0; // opacity of the grey cover over the 3D scene

      if (t < DIVE_END + 0.1) {
        intro.update(t);
        renderer.render(intro.scene, intro.camera);
        // Fade in from grey, then blur and darken into the dive.
        cover = Math.max(1 - clamp01(t / 0.6), clamp01((t - 8.35) / 0.45));
        const k = clamp01((t - 7.35) / 1.0);
        const blur = 8 * k * k;
        canvas.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
      } else {
        cover = 1;
      }

      if (t > TITLE_IN) once("titleIn", () => title.classList.add("is-on"));
      if (t > TITLE_OUT) once("titleOut", () => title.classList.add("is-off"));
      if (t > LOGO_FORM) once("logo", () => logo.classList.add("is-forming"));
      if (t > LOGO_OUT) once("logoOut", () => logo.classList.add("is-out"));
      if (t > LEAVE) once("leave", () => root.classList.add("is-leaving"));

      // Skipping: cover everything quickly, then finish.
      if (skipAt !== Infinity) {
        const k = clamp01((now - skipAt) / 300);
        cover = Math.max(cover, k);
        logo.style.opacity = String(1 - k);
        title.style.opacity = String(1 - k);
      }
      fade.style.opacity = String(cover);

      if (t > TOTAL || now - skipAt > 330) finish();
    };

    const skip = () => {
      if (skipAt === Infinity) skipAt = performance.now();
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
