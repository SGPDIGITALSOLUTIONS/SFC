(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/dist/sw.js', { scope: '/' }).catch(() => {}));
  }

  let deferredPrompt;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  document.head.insertAdjacentHTML('beforeend', `<style>
    .pwa-install{border:1px solid rgba(229,189,142,.28);border-radius:999px;background:rgba(255,255,255,.05);color:var(--gold);padding:9px 12px;font:600 .76rem "DM Sans",sans-serif;cursor:pointer}.pwa-install:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
    .pwa-pull{position:fixed;z-index:200;top:0;left:50%;display:flex;align-items:center;gap:8px;min-width:174px;justify-content:center;padding:10px 14px;border:1px solid rgba(229,189,142,.25);border-radius:0 0 18px 18px;background:rgba(35,16,24,.96);color:var(--cream);font:600 .78rem "DM Sans",sans-serif;box-shadow:0 14px 28px rgba(0,0,0,.28);transform:translate(-50%,-110%);transition:transform .16s ease}.pwa-pull.show{transform:translate(-50%,0)}.pwa-pull i{width:8px;height:8px;border-radius:50%;background:var(--rose);box-shadow:0 0 0 5px rgba(215,101,130,.1)}.pwa-pull.armed i{background:var(--gold);box-shadow:0 0 0 5px rgba(229,189,142,.1)}
  </style>`);

  if (!standalone) {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-install';
    button.hidden = true;
    button.textContent = 'Install SFC';
    button.setAttribute('aria-label', 'Install SFC on this device');
    document.querySelector('.top-actions')?.prepend(button);

    const showIosGuide = () => {
      const message = 'To install SFC on iPhone: tap Share, then Add to Home Screen.';
      if (typeof window.toast === 'function') window.toast(message);
      else window.alert(message);
    };

    if (isIos) button.hidden = false;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      button.hidden = false;
    });
    window.addEventListener('appinstalled', () => { deferredPrompt = undefined; button.hidden = true; });
    button.addEventListener('click', async () => {
      if (isIos) return showIosGuide();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = undefined;
      button.hidden = true;
    });
  }

  const pull = document.createElement('div');
  pull.className = 'pwa-pull';
  pull.setAttribute('aria-live', 'polite');
  pull.innerHTML = '<i></i><span>Pull to refresh</span>';
  document.body.append(pull);
  const pullLabel = pull.querySelector('span');
  const threshold = 82;
  let startY = 0;
  let pulling = false;

  document.addEventListener('touchstart', event => {
    if (window.scrollY === 0 && event.touches.length === 1 && !event.target.closest('input, textarea, select')) {
      startY = event.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!pulling || window.scrollY > 0) return;
    const distance = Math.max(0, event.touches[0].clientY - startY);
    if (!distance) return;
    event.preventDefault();
    const armed = distance >= threshold;
    pull.classList.toggle('show', true);
    pull.classList.toggle('armed', armed);
    pullLabel.textContent = armed ? 'Release to refresh' : 'Pull to refresh';
  }, { passive: false });
  document.addEventListener('touchend', event => {
    if (!pulling) return;
    const distance = event.changedTouches[0].clientY - startY;
    pulling = false;
    if (distance >= threshold && window.scrollY === 0) {
      pull.classList.add('show');
      pullLabel.textContent = 'Refreshing…';
      window.setTimeout(() => location.reload(), 120);
      return;
    }
    pull.classList.remove('show', 'armed');
  }, { passive: true });
  document.addEventListener('touchcancel', () => {
    pulling = false;
    pull.classList.remove('show', 'armed');
  }, { passive: true });
  window.addEventListener('offline', () => typeof window.toast === 'function' && window.toast('You’re offline. Changes need a connection to save.'));
})();
