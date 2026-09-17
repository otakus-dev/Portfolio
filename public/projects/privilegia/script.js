const body = document.body;
const menuButton = document.querySelector('.menu-toggle');
const dialog = document.querySelector('#tour-dialog');
const form = document.querySelector('#tour-form');

if (menuButton) {
  menuButton.addEventListener('click', () => {
    const open = body.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.header nav a').forEach((link) => link.addEventListener('click', () => body.classList.remove('menu-open')));
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -30px' });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

function openDialog() {
  if (!dialog) return;
  form.hidden = false;
  dialog.querySelector('.form-success').hidden = true;
  dialog.showModal();
  body.classList.add('locked');
  setTimeout(() => form.elements.name.focus(), 50);
}
function closeDialog() { dialog?.close(); }
document.querySelectorAll('.open-tour').forEach((button) => button.addEventListener('click', openDialog));
document.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
dialog?.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
dialog?.addEventListener('close', () => body.classList.remove('locked'));
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  form.hidden = true;
  dialog.querySelector('.form-success').hidden = false;
  form.reset();
});

const roomButtons = document.querySelectorAll('[data-room]');
const priceSelect = document.querySelector('#price-filter');
const apartmentCards = document.querySelectorAll('.apartment-card[data-rooms]');
let activeRoom = 'all';
function filterApartments() {
  const maxPrice = Number(priceSelect?.value || Infinity);
  let visible = 0;
  apartmentCards.forEach((card) => {
    const roomMatch = activeRoom === 'all' || card.dataset.rooms === activeRoom;
    const priceMatch = Number(card.dataset.price) <= maxPrice;
    const hidden = !roomMatch || !priceMatch;
    card.classList.toggle('is-hidden', hidden);
    if (!hidden) visible += 1;
  });
  const count = document.querySelector('#result-count');
  if (count) count.textContent = `${visible} ${visible === 1 ? 'квартира' : visible < 5 ? 'квартиры' : 'квартир'}`;
}
roomButtons.forEach((button) => button.addEventListener('click', () => {
  roomButtons.forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  activeRoom = button.dataset.room;
  filterApartments();
}));
priceSelect?.addEventListener('change', filterApartments);

const calcPrice = document.querySelector('#calc-price');
const calcDown = document.querySelector('#calc-down');
const calcTerm = document.querySelector('#calc-term');
function calculateMortgage() {
  if (!calcPrice) return;
  const price = Number(calcPrice.value);
  const downPercent = Number(calcDown.value);
  const years = Number(calcTerm.value);
  const principal = price * (1 - downPercent / 100);
  const rate = .14 / 12;
  const months = years * 12;
  const payment = principal * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
  document.querySelector('#price-value').textContent = `${(price / 1e6).toFixed(1)} млн ₽`;
  document.querySelector('#down-value').textContent = `${downPercent}%`;
  document.querySelector('#term-value').textContent = `${years} лет`;
  document.querySelector('#payment-value').textContent = `${Math.round(payment / 1000)} 000 ₽`;
}
[calcPrice, calcDown, calcTerm].forEach((input) => input?.addEventListener('input', calculateMortgage));
calculateMortgage();

const apartmentData = {
  a1:{title:'Резиденция 73,2 м²',price:'28 900 000 ₽',rooms:'3 комнаты',floor:'8 этаж из 12',windows:'Окна во двор и на реку',number:'№ 84'},
  a2:{title:'Резиденция 51,8 м²',price:'21 600 000 ₽',rooms:'2 комнаты',floor:'5 этаж из 12',windows:'Окна в тихий двор',number:'№ 52'},
  a3:{title:'Резиденция 96,4 м²',price:'37 800 000 ₽',rooms:'4 комнаты',floor:'10 этаж из 12',windows:'Панорамный вид на реку',number:'№ 106'},
  a4:{title:'Резиденция 39,5 м²',price:'16 900 000 ₽',rooms:'1 комната',floor:'4 этаж из 12',windows:'Окна на бульвар',number:'№ 41'},
  a5:{title:'Резиденция 64,1 м²',price:'25 400 000 ₽',rooms:'2 комнаты',floor:'9 этаж из 12',windows:'Угловое остекление',number:'№ 93'},
  a6:{title:'Пентхаус 128,7 м²',price:'54 700 000 ₽',rooms:'4 комнаты',floor:'12 этаж',windows:'Терраса и вид на реку',number:'№ 121'}
};
const detailTitle = document.querySelector('#detail-title');
if (detailTitle) {
  const id = new URLSearchParams(location.search).get('id') || 'a1';
  const data = apartmentData[id] || apartmentData.a1;
  detailTitle.textContent = data.title;
  document.querySelector('#detail-price').textContent = data.price;
  document.querySelector('#detail-rooms').textContent = data.rooms;
  document.querySelector('#detail-floor').textContent = data.floor;
  document.querySelector('#detail-windows').textContent = data.windows;
  document.querySelector('#detail-number').textContent = data.number;
}
