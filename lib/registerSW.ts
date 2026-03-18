export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[SW] registrado:', reg.scope))
      .catch((err) => console.error('[SW] erro:', err))
  })
}