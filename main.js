(() => {
  "use strict";

  const DISCORD = "VABIMS";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Background video: make sure it plays ---------- */
  const video = document.querySelector(".bg-video");
  if (video) {
    video.muted = true;
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  /* ---------- CTA: drop the entrance animation once done so hover works ---------- */
  document.querySelectorAll(".anim-pulse").forEach((el) => {
    if (reduceMotion) {
      el.classList.add("is-in");
      return;
    }
    el.addEventListener("animationend", () => el.classList.add("is-in"), { once: true });
  });

  /* ---------- Copy Discord handle ---------- */
  const toast = document.querySelector(".toast");
  let toastTimer;

  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {
      ok = false;
    }
    ta.remove();
    return ok;
  };

  const copyDiscord = async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(DISCORD);
        ok = true;
      }
    } catch (_) {
      ok = false;
    }
    if (!ok) ok = fallbackCopy(DISCORD);
    showToast(ok ? `Copied @${DISCORD}. Add me on Discord!` : `Find me on Discord: @${DISCORD}`);
  };

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("mobile-menu");
  const overlay = document.querySelector(".menu-overlay");

  const setMenu = (open) => {
    if (!burger || !menu || !overlay) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
    overlay.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };

  const isOpen = () => burger && burger.getAttribute("aria-expanded") === "true";

  if (burger) burger.addEventListener("click", () => setMenu(!isOpen()));
  if (overlay) overlay.addEventListener("click", () => setMenu(false));
  if (menu) {
    menu.querySelectorAll("a, button").forEach((el) =>
      el.addEventListener("click", () => setMenu(false))
    );
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setMenu(false);
      burger.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720 && isOpen()) setMenu(false);
  });

  document.querySelectorAll("[data-copy-discord]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      copyDiscord();
    })
  );

  /* ---------- Stats count-up ---------- */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const format = (value, decimals, suffix) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;

  const values = Array.from(document.querySelectorAll(".stat-value"));

  const runCount = (el, i) => {
    const target = parseFloat(el.dataset.target) || 0;
    const decimals = parseInt(el.dataset.decimals, 10) || 0;
    const suffix = el.dataset.suffix || "";

    if (reduceMotion) {
      el.textContent = format(target, decimals, suffix);
      return;
    }

    const duration = 1500 + i * 80;
    const delay = 480 + i * 90;

    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = format(target * easeOutCubic(t), decimals, suffix);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          runCount(el, values.indexOf(el));
          obs.unobserve(el);
        });
      },
      { threshold: 0.25 }
    );
    values.forEach((el) => io.observe(el));
  } else {
    values.forEach(runCount);
  }
})();
