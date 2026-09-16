const menuButton = document.querySelector('.menu-button');
const cartButtons = document.querySelectorAll('.cart-button');
const cartDrawer = document.querySelector('.cart-drawer');
const cartOverlay = document.querySelector('.cart-overlay');
const cartItems = document.querySelector('.cart-items');
const cartBottom = document.querySelector('.cart-bottom');
const formatter = new Intl.NumberFormat('ru-RU');
const cart = new Map();

menuButton.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.header nav a').forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: .1, rootMargin: '0px 0px -30px' });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

document.querySelectorAll('.filters button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.product').forEach((product) => {
      product.classList.toggle('is-hidden', filter !== 'all' && product.dataset.category !== filter);
    });
  });
});

function updateCart() {
  const products = [...cart.values()];
  const count = products.reduce((sum, item) => sum + item.quantity, 0);
  const total = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach((element) => { element.textContent = count; });
  cartItems.innerHTML = products.length ? products.map((item) => `
    <article class="cart-item">
      <img src="${item.image}" alt="">
      <div><b>${item.name}</b><span>${item.quantity} × ${formatter.format(item.price)} ₽</span></div>
      <button type="button" data-remove="${item.id}" aria-label="Удалить ${item.name}">×</button>
    </article>`).join('') : '<p class="cart-empty">Здесь пока пусто.<br>Добавьте предметы из каталога.</p>';
  document.querySelector('.cart-total').textContent = `${formatter.format(total)} ₽`;
  cartBottom.hidden = products.length === 0;
}

function openCart() {
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartOverlay.hidden = false;
  document.body.classList.add('locked');
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartOverlay.hidden = true;
  document.body.classList.remove('locked');
}

document.querySelectorAll('.add-button').forEach((button) => {
  button.addEventListener('click', () => {
    const product = button.closest('.product');
    const id = product.dataset.id;
    const current = cart.get(id);
    cart.set(id, current ? { ...current, quantity: current.quantity + 1 } : {
      id,
      name: product.dataset.name,
      price: Number(product.dataset.price),
      image: product.querySelector('img').src,
      quantity: 1
    });
    updateCart();
    openCart();
  });
});

cartButtons.forEach((button) => button.addEventListener('click', openCart));
document.querySelector('.cart-close').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCart(); });
cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  cart.delete(button.dataset.remove);
  updateCart();
});

document.querySelector('.subscribe form').addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  document.querySelector('.subscribe-status').textContent = 'Спасибо! Первое письмо уже готовим.';
});

document.querySelector('.cart-bottom>button').addEventListener('click', () => {
  document.querySelector('.cart-bottom small').textContent = 'Демо-режим: заказ собран, но оплата отключена.';
});
