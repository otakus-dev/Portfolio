const loader = document.querySelector('.page-loader');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-header nav');
const dialog = document.querySelector('#booking-dialog');
const form = document.querySelector('#booking-form');
const success = document.querySelector('.booking-success');

function hideLoader() {
  loader?.classList.add('is-hidden');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(hideLoader, 180), { once: true });
} else {
  window.setTimeout(hideLoader, 180);
}
window.setTimeout(hideLoader, 1400);

menuButton.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -35px' });

document.querySelectorAll('.reveal, .reveal-image').forEach((element, index) => {
  if (element.classList.contains('reveal')) element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
  revealObserver.observe(element);
});

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.counter);
    const decimal = element.dataset.decimal === 'true';
    const start = performance.now();
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = decimal ? (target * eased).toFixed(1) : Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    counterObserver.unobserve(element);
  });
}, { threshold: .7 });

document.querySelectorAll('[data-counter]').forEach((counter) => counterObserver.observe(counter));

document.querySelectorAll('.service-item button').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.service-item');
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.service-item').forEach((entry) => {
      entry.classList.remove('is-open');
      entry.querySelector('button').setAttribute('aria-expanded', 'false');
      entry.querySelector('button i').textContent = '+';
    });
    if (!isOpen) {
      item.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('i').textContent = '−';
    }
  });
});

function openDialog() {
  form.hidden = false;
  success.hidden = true;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  window.setTimeout(() => form.elements.name.focus(), 50);
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove('dialog-open');
}

document.querySelectorAll('.js-book').forEach((button) => button.addEventListener('click', openDialog));
document.querySelector('.dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  form.hidden = true;
  success.hidden = false;
  form.reset();
});
