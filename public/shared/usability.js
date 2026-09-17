// Keep dialog padding clickable; close only when the actual backdrop is clicked.
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) {
      event.stopImmediatePropagation();
    }
  }, true);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const openButton = document.querySelector('.menu-button[aria-expanded="true"],.menu-toggle[aria-expanded="true"]');
  if (openButton) {
    openButton.click();
    openButton.focus();
  }
});

document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.menu-button,.menu-toggle').forEach(button => button.setAttribute('aria-expanded', 'false'));
}));
