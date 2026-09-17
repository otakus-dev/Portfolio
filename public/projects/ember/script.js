document.documentElement.classList.add('js');

const dialog = document.querySelector('#booking-dialog');
const formWrap = document.querySelector('#booking-form-wrap');
const success = document.querySelector('#booking-success');
const form = document.querySelector('#booking-form');

document.querySelectorAll('.open-booking').forEach((button) => {
  button.addEventListener('click', () => {
    formWrap.hidden = false;
    success.hidden = true;
    dialog.showModal();
  });
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-done').addEventListener('click', () => dialog.close());

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formWrap.hidden = true;
  success.hidden = false;
  form.reset();
});

const dateInput = form.elements.date;
const localToday = new Date();
dateInput.min = [localToday.getFullYear(), String(localToday.getMonth() + 1).padStart(2, '0'), String(localToday.getDate()).padStart(2, '0')].join('-');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
