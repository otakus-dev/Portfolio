const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });

  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }));
}

const calculator = document.querySelector('#route-calculator');
const result = document.querySelector('#calc-result');

if (calculator && result) {
  const distances = {
    'Москва|Липецк': 460,
    'Москва|Воронеж': 520,
    'Москва|Ростов-на-Дону': 1080,
    'Липецк|Воронеж': 130,
    'Липецк|Ростов-на-Дону': 650,
    'Воронеж|Ростов-на-Дону': 560
  };

  calculator.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(calculator);
    const from = data.get('from');
    const to = data.get('to');
    const weight = Number(data.get('weight')) || 1;
    const type = data.get('type');

    if (from === to) {
      result.textContent = 'Выберите разные города отправления и назначения.';
      return;
    }

    const direct = distances[`${from}|${to}`];
    const reverse = distances[`${to}|${from}`];
    const distance = direct || reverse || 720;
    const typeFactor = type === 'Рефрижератор' ? 1.22 : type === 'Негабаритный' ? 1.48 : 1;
    const weightFactor = Math.max(.72, Math.min(1.25, .65 + weight / 35));
    const price = Math.round((distance * 78 * typeFactor * weightFactor + 14500) / 1000) * 1000;

    result.innerHTML = `Маршрут <strong>${from} → ${to}</strong> · около ${distance} км · предварительно <strong>от ${price.toLocaleString('ru-RU')} ₽</strong>. Точную стоимость рассчитает логист.`;
  });
}
