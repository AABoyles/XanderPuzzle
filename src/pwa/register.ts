export interface RegisterOptions {
  /** Called when a new version is installed and waiting. Call `apply` to activate it and reload. */
  onUpdateReady: (apply: () => void) => void;
}

/** Registers ./sw.js in production builds only. If never applied, the update activates on next launch. */
export function registerServiceWorker(opts: RegisterOptions): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (reloading || !applying) return;
    reloading = true;
    window.location.reload();
  });
  let applying = false;
  const announce = (worker: ServiceWorker) => {
    opts.onUpdateReady(() => {
      applying = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };
  const start = () => {
    sw.register('./sw.js').then(
      (reg) => {
        // Only announce updates when a worker already controls the page (not on first install).
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && sw.controller) announce(worker);
          });
        };
        if (reg.waiting && sw.controller) announce(reg.waiting);
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
      },
      (err) => console.warn('Service worker registration failed', err),
    );
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
