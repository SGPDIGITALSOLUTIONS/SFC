(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/dist/sw.js', { scope: '/' }).catch(() => {}));
  }

  let deferredPrompt;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pwa-install';
  button.hidden = true;
  button.textContent = 'Install SFC';
  button.setAttribute('aria-label', 'Install SFC on this device');
  document.head.insertAdjacentHTML('beforeend', `<style>
    .pwa-install{border:1px solid rgba(229,189,142,.28);border-radius:999px;background:rgba(255,255,255,.05);color:var(--gold);padding:9px 12px;font:600 .76rem "DM Sans",sans-serif;cursor:pointer}.pwa-install:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
  </style>`);
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
  window.addEventListener('offline', () => typeof window.toast === 'function' && window.toast('You’re offline. Changes need a connection to save.'));
})();
