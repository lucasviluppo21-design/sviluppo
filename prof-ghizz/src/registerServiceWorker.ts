// Questo file prova a registrare il service worker in produzione.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/ngsw-worker.js')
      .then(reg => console.log('Service Worker registrato', reg))
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}
