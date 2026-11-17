const wins = [...document.querySelectorAll('.win')];
const tasks = document.getElementById('tasks');
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Barra de tarefas: um botão por janela ---------- */
const taskBtns = new Map();
wins.forEach(win => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'task';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', win.dataset.title);
  btn.innerHTML = `<svg aria-hidden="true"><use href="#${win.dataset.icon}"/></svg><span></span>`;
  btn.querySelector('span').textContent = win.dataset.title;
  btn.addEventListener('click', () => {
    const shown = !win.hidden && !win.classList.contains('collapsed');
    const current = win.classList.contains('active');
    if (shown && current) { setCollapsed(win, true); } else { openWin(win); }
  });
  tasks.append(btn);
  taskBtns.set(win, btn);
});

function sync(win) {
  const btn = taskBtns.get(win);
  const shown = !win.hidden && !win.classList.contains('collapsed');
  btn.setAttribute('aria-pressed', String(shown && win.classList.contains('active')));
  btn.classList.toggle('off', !shown);
}

function setActive(win) {
  wins.forEach(w => {
    const on = w === win;
    w.classList.toggle('active', on);
    w.classList.toggle('inactive', !on);
    sync(w);
  });
}

function setCollapsed(win, state) {
  win.classList.toggle('collapsed', state);
  sync(win);
}

function openWin(win, scroll = true) {
  win.hidden = false;
  setCollapsed(win, false);
  setActive(win);
  if (scroll) win.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- Botões da janela ---------- */
wins.forEach(win => {
  win.querySelector('.titlebar').addEventListener('dblclick', e => {
    if (e.target.closest('.ctrl')) return;
    setCollapsed(win, !win.classList.contains('collapsed'));
  });
  win.querySelectorAll('.ctrl button').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'min') setCollapsed(win, !win.classList.contains('collapsed'));
    if (act === 'max') win.classList.toggle('max');
    if (act === 'close') { win.hidden = true; win.classList.remove('active'); sync(win); }
  }));
  win.addEventListener('pointerdown', () => setActive(win));
  win.addEventListener('focusin', () => setActive(win));
});

/* Links internos reabrem a janela de destino, mesmo fechada */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.getElementById(a.getAttribute('href').slice(1));
  if (target && target.classList.contains('win')) {
    e.preventDefault();
    openWin(target);
    closeStart();
  }
});

/* A janela mais próxima do centro da tela fica ativa */
const io = new IntersectionObserver(entries => {
  const best = entries.filter(e => e.isIntersecting && !e.target.hidden)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (best) setActive(best.target);
}, { threshold: [0.3, 0.6, 0.9], rootMargin: '-20% 0px -20% 0px' });
wins.forEach(w => io.observe(w));
setActive(wins[0]);

/* ---------- Menu Iniciar ---------- */
function closeStart() {
  startMenu.hidden = true;
  startBtn.setAttribute('aria-expanded', 'false');
}
startBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = startMenu.hidden;
  startMenu.hidden = !open;
  startBtn.setAttribute('aria-expanded', String(open));
  if (open) startMenu.querySelector('a').focus();
});
document.addEventListener('click', e => {
  if (!startMenu.hidden && !startMenu.contains(e.target)) closeStart();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !startMenu.hidden) { closeStart(); startBtn.focus(); }
});

/* ---------- Relógio ---------- */
const clock = document.getElementById('clock');
function tick() {
  clock.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 15000);
