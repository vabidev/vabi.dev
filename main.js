(() => {
  "use strict";

  const DISCORD = "VABIMS";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* Storage can throw (private mode, blocked site data). */
  const safe = (store) => ({
    get(k) {
      try {
        return window[store].getItem(k);
      } catch (_) {
        return null;
      }
    },
    set(k, v) {
      try {
        window[store].setItem(k, v);
      } catch (_) {
        /* ignore */
      }
    },
  });
  const local = safe("localStorage");
  const session = safe("sessionStorage");

  /* ---------- Copy ---------- */
  const I18N = {
    en: {
      about: "About",
      projects: "Projects",
      clock: "Clock",
      github: "GitHub",
      contact: "Contact",
      select: "Select",
      language: "Language",
      back: "Back",
      navigate: "Navigate",
      skip: "Press any key to skip",
      aboutTag: "Restless ideas, built into code.",
      aboutText:
        "I'm Vinicius, a developer and student from Brazil. I've been building with AI since 2021, turning the ideas in my head into projects that solve real problems.",
      rName: "Name",
      rLocation: "Location",
      vLocation: "Brazil",
      rAI: "Building with AI",
      vAI: "Since 2021",
      rProjects: "Projects built",
      rIdeas: "Ideas running",
      rDiscord: "Discord",
      contactLabel: "Find me on Discord",
      copy: "Copy Discord handle",
      openGithub: "Open GitHub",
      backOpt: "Back",
      copied: "Copied @VABIMS to the clipboard.",
      copyFail: "Couldn't copy. My handle is @VABIMS.",
      metaCode: "Public · Code on GitHub",
      metaLive: "Public · Live site",
      metaPrivate: "Private · No public link",
      privateNote: "This one is private, so there's no public link.",
    },
    pt: {
      about: "Sobre",
      projects: "Projetos",
      clock: "Relógio",
      github: "GitHub",
      contact: "Contato",
      select: "Selecionar",
      language: "Idioma",
      back: "Voltar",
      navigate: "Navegar",
      skip: "Pressione qualquer tecla para pular",
      aboutTag: "Ideias inquietas, transformadas em código.",
      aboutText:
        "Sou o Vinicius, desenvolvedor e estudante do Brasil. Uso IA na prática desde 2021, transformando as ideias da minha cabeça em projetos que resolvem problemas reais.",
      rName: "Nome",
      rLocation: "Local",
      vLocation: "Brasil",
      rAI: "Construindo com IA",
      vAI: "Desde 2021",
      rProjects: "Projetos criados",
      rIdeas: "Ideias rodando",
      rDiscord: "Discord",
      contactLabel: "Me encontre no Discord",
      copy: "Copiar usuário do Discord",
      openGithub: "Abrir o GitHub",
      backOpt: "Voltar",
      copied: "@VABIMS copiado para a área de transferência.",
      copyFail: "Não deu para copiar. Meu usuário é @VABIMS.",
      metaCode: "Público · Código no GitHub",
      metaLive: "Público · Site no ar",
      metaPrivate: "Privado · Sem link público",
      privateNote: "Este é privado, então não tem link público.",
    },
  };

  const PROJECTS = [
    {
      name: "Nexumpedia",
      meta: "metaCode",
      desc: {
        en: "An encyclopedia with its own identity, controlled publishing and a focus on pleasant reading.",
        pt: "Enciclopédia com identidade própria, publicação controlada e foco em leitura agradável.",
      },
    },
    {
      name: "Lar Feliz Animal",
      meta: "metaLive",
      desc: {
        en: "An adoption platform that connects animals, adopters and shelters, with search, favourites and applications.",
        pt: "Plataforma de adoção que conecta animais, adotantes e abrigos, com busca, favoritos e candidaturas.",
      },
    },
    {
      name: "Fila Zero",
      meta: "metaCode",
      desc: {
        en: "Cuts queues and organises service. Now maintained as an open-source edition.",
        pt: "Reduz filas e organiza atendimentos. Hoje é mantido como edição open source.",
      },
    },
    {
      name: "SINEP",
      meta: "metaPrivate",
      desc: {
        en: "An integrated school management system that brings staff, teachers, students and parents closer.",
        pt: "Sistema integrado de gestão escolar para aproximar gestão, professores, estudantes e responsáveis.",
      },
    },
    {
      name: "OrbisLink",
      meta: "metaPrivate",
      desc: {
        en: "An experimental project for local communication, file transfer and integration between devices.",
        pt: "Projeto experimental de comunicação local, transferência, segmentação e integração entre dispositivos.",
      },
    },
  ];

  let lang = local.get("vabi-lang") === "pt" ? "pt" : "en";
  const t = (key) => I18N[lang][key] || I18N.en[key] || key;

  /* ---------- Screens ---------- */
  const screens = {};
  $$(".screen").forEach((el) => (screens[el.dataset.screen] = el));
  const selected = { menu: 0, about: 0, projects: 0, clock: 0, contact: 0 };
  let current = "boot";

  const hintsLayer = $(".hints-layer");
  const hint = (name) => $(`[data-hint="${name}"]`);

  // Which key hints each screen shows (like the bottom bar on the console).
  const HINTS = {
    menu: ["enter", "shift", "nav"],
    about: ["enter", "esc", "nav"],
    projects: ["enter", "esc", "nav"],
    clock: ["esc"],
    contact: ["enter", "esc", "nav"],
  };

  const items = (name) => (screens[name] ? $$("[data-item]", screens[name]) : []);

  const projInfo = {
    name: $(".proj-name"),
    desc: $(".proj-desc"),
    meta: $(".proj-meta"),
  };

  const renderProject = (i) => {
    const p = PROJECTS[i];
    if (!p) return;
    projInfo.name.textContent = p.name;
    projInfo.desc.textContent = p.desc[lang];
    projInfo.meta.textContent = t(p.meta);
  };

  const select = (name, index, { focus = true } = {}) => {
    const list = items(name);
    if (!list.length) return;
    const i = (index + list.length) % list.length;
    selected[name] = i;
    list.forEach((el, k) => {
      const on = k === i;
      el.classList.toggle("is-selected", on);
      el.tabIndex = on ? 0 : -1;
    });
    if (name === "projects") renderProject(i);
    if (focus) list[i].focus({ preventScroll: true });
  };

  const clearStatus = () => $$(".status").forEach((s) => (s.textContent = ""));

  const show = (name) => {
    if (!screens[name]) return;
    current = name;
    clearStatus();

    Object.entries(screens).forEach(([key, el]) => {
      const on = key === name;
      el.classList.toggle("is-active", on);
      el.toggleAttribute("inert", !on);
      el.setAttribute("aria-hidden", String(!on));
    });

    const visible = HINTS[name] || [];
    ["enter", "shift", "esc", "nav"].forEach((h) => {
      const el = hint(h);
      if (el) el.hidden = !visible.includes(h);
    });

    // Orbs: full on the menu, faint behind the contact dialog, off elsewhere.
    window.Orbs.setLevel(name === "menu" ? 1 : name === "contact" ? 0.22 : 0);

    if (name === "clock") window.ClockScreen.start();
    else window.ClockScreen.stop();

    select(name, selected[name]);
  };

  const back = () => {
    if (current !== "menu" && current !== "boot") show("menu");
  };

  const activate = () => {
    const el = items(current)[selected[current]];
    if (el) el.click();
  };

  /* ---------- Language ---------- */
  const applyLang = () => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    $$("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    if (current === "projects") renderProject(selected.projects);
  };

  const toggleLang = () => {
    lang = lang === "en" ? "pt" : "en";
    local.set("vabi-lang", lang);
    applyLang();
  };

  /* ---------- Clipboard ---------- */
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

  const copyDiscord = async (statusEl) => {
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
    if (statusEl) statusEl.textContent = t(ok ? "copied" : "copyFail");
  };

  /* ---------- Actions ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-item]");
    if (!el || current === "boot") return;

    // Clicking an item also selects it.
    const list = items(current);
    const i = list.indexOf(el);
    if (i >= 0 && i !== selected[current]) select(current, i, { focus: false });

    const action = el.dataset.action;
    if (!action) return; // plain links open on their own
    e.preventDefault();

    const status = $(".status", screens[current]);
    if (["about", "projects", "clock", "contact"].includes(action)) show(action);
    else if (action === "back") back();
    else if (action === "copy") copyDiscord(status);
    else if (action === "private") projInfo.meta.textContent = t("privateNote");
  });

  // Hovering with a mouse moves the selection, like moving the cursor.
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || current === "boot") return;
    const el = e.target.closest("[data-item]");
    if (!el) return;
    const i = items(current).indexOf(el);
    if (i >= 0 && i !== selected[current]) select(current, i, { focus: false });
  });

  // On-screen key hints are buttons too (handy on touch screens).
  $$("[data-hint]").forEach((el) =>
    el.addEventListener("click", () => {
      const h = el.dataset.hint;
      if (h === "enter") activate();
      else if (h === "shift") toggleLang();
      else if (h === "esc") back();
    })
  );

  document.addEventListener("keydown", (e) => {
    if (current === "boot" || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const horizontal = current === "projects";

    if (k === "ArrowDown" || (horizontal && k === "ArrowRight")) {
      e.preventDefault();
      select(current, selected[current] + 1);
    } else if (k === "ArrowUp" || (horizontal && k === "ArrowLeft")) {
      e.preventDefault();
      select(current, selected[current] - 1);
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      activate();
    } else if (k === "Escape" || k === "Backspace") {
      e.preventDefault();
      back();
    } else if (k === "Shift" && !e.repeat) {
      toggleLang();
    }
  });

  /* ---------- Start ---------- */
  const enter = () => {
    current = "menu";
    hintsLayer.classList.add("is-visible");
    window.Orbs.start();
    show("menu");
  };

  applyLang();
  Object.values(screens).forEach((el) => el.setAttribute("inert", ""));

  const playBoot = !reduceMotion && !session.get("vabi-booted") && window.Boot && window.Boot.supported();
  if (playBoot) {
    session.set("vabi-booted", "1");
    window.Boot.start(enter);
  } else {
    enter();
  }
})();
