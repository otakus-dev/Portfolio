const dialog = document.querySelector('#contact-dialog');
const form = document.querySelector('#contact-form');
const success = document.querySelector('#form-success');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('.submit-button');

function openContactDialog() {
  status.textContent = '';
  form.hidden = false;
  success.hidden = true;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  requestAnimationFrame(() => form.elements.name.focus());
}

function closeContactDialog() {
  dialog.close();
  document.body.classList.remove('dialog-open');
}

document.querySelectorAll('.open-contact').forEach((button) => {
  button.addEventListener('click', openContactDialog);
});

document.querySelector('.dialog-close').addEventListener('click', closeContactDialog);
document.querySelector('.dialog-done').addEventListener('click', () => {
  closeContactDialog();
  form.reset();
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeContactDialog();
  }
});

dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form).entries());
  submitButton.disabled = true;
  status.textContent = 'Отправляем заявку…';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        consent: data.consent === 'on'
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(result.message || 'Не удалось отправить заявку.');

    form.hidden = true;
    success.hidden = false;
    status.textContent = '';
  } catch (error) {
    status.textContent = `${error.message} Напишите напрямую: ermohinandrei@bk.ru`;
  } finally {
    submitButton.disabled = false;
  }
});
