(() => {
  const main = document.querySelector('main');
  if (main && !document.querySelector('.skip,.portfolio-skip')) {
    if (!main.id) main.id = 'main-content';
    const skip = document.createElement('a');
    skip.href = '#' + main.id; skip.className = 'portfolio-skip'; skip.textContent = 'К содержимому';
    document.body.prepend(skip);
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    if (!dialog.getAttribute('aria-labelledby')) {
      const title = dialog.querySelector('h2,h3');
      if (title) { title.id ||= dialog.id + '-title'; dialog.setAttribute('aria-labelledby', title.id); }
    }
    dialog.querySelectorAll('.dialog-close,.search-close').forEach(button => button.setAttribute('aria-label','Закрыть окно'));
  });
  const toggle = document.querySelector('.menu-button,.menu-toggle');
  const nav = document.querySelector('.mobile-nav') || document.querySelector('.header nav,.site-header nav');
  if (toggle && nav) {
    nav.id ||= 'project-navigation';
    toggle.setAttribute('aria-controls', nav.id);
    const sync = () => {
      const mobile = getComputedStyle(toggle).display !== 'none';
      const open = document.body.classList.contains('menu-open') || nav.classList.contains('is-open') || nav.classList.contains('open');
      nav.inert = mobile && !open;
      toggle.setAttribute('aria-expanded', String(mobile && open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    const close = () => {
      document.body.classList.remove('menu-open');
      nav.classList.remove('is-open','open');
      sync();
    };
    new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
    new MutationObserver(sync).observe(nav, {attributes:true, attributeFilter:['class']});
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { close(); toggle.focus(); }
    });
    window.addEventListener('resize', sync);
    sync();
  }
})();
