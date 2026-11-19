document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Céu estrelado ---------- */
(() => {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [], w = 0, h = 0, dpr = 1, running = true;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.2 + .2,
      a: Math.random() * Math.PI * 2,
      s: Math.random() * .02 + .004,
      v: Math.random() * .08 + .01,
      hue: Math.random() < .25 ? 270 : 250
    }));
    if (reduceMotion) draw();
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.a += st.s;
      if (!reduceMotion) { st.y -= st.v; if (st.y < -2) { st.y = h + 2; st.x = Math.random() * w; } }
      const alpha = .35 + Math.sin(st.a) * .35;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${st.hue}, 90%, 88%, ${alpha})`;
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function loop() { if (running) draw(); requestAnimationFrame(loop); }
  resize();
  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => { running = e.isIntersecting; }).observe(canvas);
  if (!reduceMotion) loop();
})();

/* ---------- Parallax no hero ---------- */
const layers = [...document.querySelectorAll('[data-depth]')];
layers.forEach(el => el.classList.add('parallax'));
if (!reduceMotion && finePointer) {
  const hero = document.querySelector('.hero');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    layers.forEach(el => {
      const d = +el.dataset.depth;
      el.style.translate = `${px * d}px ${py * d}px`;
    });
  });
  hero.addEventListener('pointerleave', () => layers.forEach(el => { el.style.translate = ''; }));
}

/* ---------- Brilho que segue o cursor ---------- */
if (finePointer && !reduceMotion) {
  const glow = document.querySelector('.cursor-glow');
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; document.body.classList.add('has-pointer'); }, { passive: true });
  (function follow() {
    gx += (tx - gx) * .12; gy += (ty - gy) * .12;
    glow.style.transform = `translate(${gx}px, ${gy}px)`;
    requestAnimationFrame(follow);
  })();
}

/* ---------- Palavra que troca no slogan ---------- */
(() => {
  const el = document.getElementById('rotator');
  const words = ['reais', 'úteis', 'no ar', 'com IA'];
  let i = 0;
  if (reduceMotion) return;
  setInterval(() => {
    el.classList.add('out');
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove('out');
    }, 380);
  }, 2600);
})();

/* ---------- Revelar ao rolar ---------- */
const reveals = [...document.querySelectorAll('.reveal')];
reveals.forEach(el => {
  const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
  el.style.setProperty('--d', `${Math.min(siblings.indexOf(el), 6) * 0.08}s`);
});
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    revealIO.unobserve(e.target);
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    if (e.target.matches('[data-count]')) countUp(e.target);
  });
}, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => revealIO.observe(el));

/* ---------- Contadores ---------- */
function countUp(el) {
  const end = +el.dataset.count;
  if (reduceMotion || !end) return;
  const start = end > 1000 ? end - 40 : 0;
  const t0 = performance.now(), dur = 1400;
  (function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (end - start) * eased);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/* ---------- Cards com inclinação e luz ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.project').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--x', `${x * 100}%`);
      card.style.setProperty('--y', `${y * 100}%`);
      card.style.setProperty('--rx', `${(.5 - y) * 6}deg`);
      card.style.setProperty('--ry', `${(x - .5) * 8}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* Botões magnéticos */
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * .25}px`);
      btn.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * .35}px`);
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });
}

/* ---------- Navegação ---------- */
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menu-btn');
const navLinks = document.getElementById('nav-links');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

function setMenu(open) {
  navLinks.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}
menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
document.addEventListener('click', e => { if (!nav.contains(e.target)) setMenu(false); });

/* Link da seção atual */
const sectionIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.querySelectorAll('a').forEach(a => a.classList.toggle('current', a.getAttribute('href') === `#${e.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id], .hero').forEach(s => sectionIO.observe(s));

/* ---------- Copiar Discord ---------- */
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
document.getElementById('copy-discord').addEventListener('click', async e => {
  const btn = e.currentTarget;
  const label = btn.querySelector('span');
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    showToast('Copiado! Agora é só me adicionar no Discord.');
    label.textContent = 'Copiado!';
  } catch {
    showToast('Meu usuário no Discord é @VABIMS');
  }
  setTimeout(() => { label.textContent = 'Copiar usuário'; }, 2400);
});

/* ---------- Relógio (horário de Brasília) ---------- */
const clock = document.getElementById('clock');
const tick = () => {
  clock.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};
tick();
setInterval(tick, 15000);
