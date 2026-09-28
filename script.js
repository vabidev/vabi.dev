const toggle = document.querySelector('.mobile-toggle');
const menu = document.querySelector('.mobile-menu');

toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  menu.hidden = open;
});

menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.hidden = true;
  toggle?.setAttribute('aria-expanded', 'false');
}));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.launcher-nav a')];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if (!visible) return;
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${visible.target.id}`));
}, {threshold:[0.35,0.55,0.75]});
sections.forEach(section => observer.observe(section));

document.getElementById('year').textContent = new Date().getFullYear();
