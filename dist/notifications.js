(() => {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return;

  const toUint8Array = value => {
    const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
  };
  const request = async (url, options) => {
    const response = await fetch(url, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Notifications could not be updated.');
    return body;
  };
  let button;
  const label = () => {
    if (!button) return;
    button.textContent = Notification.permission === 'granted' ? 'Alerts on' : 'Turn on alerts';
  };
  async function subscribe({ ask = false } = {}) {
    if (ask && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notifications were not allowed on this device.');
    }
    if (Notification.permission !== 'granted') return;
    const { publicKey } = await request('/api/push/config');
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
    await request('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription }) });
    label();
  }
  function mount() {
    if (button) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-install';
    button.setAttribute('aria-label', 'Turn on SFC notifications for this device');
    label();
    button.onclick = async () => {
      try {
        await subscribe({ ask: true });
        if (typeof toast === 'function') toast('Alerts are on for this device.');
      } catch (error) {
        if (typeof toast === 'function') toast(error.message);
      }
    };
    document.querySelector('.top-actions')?.prepend(button);
    subscribe().catch(() => {});
  }
  window.addEventListener('sfc:authenticated', mount, { once: true });
})();
