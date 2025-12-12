// Versione JS della registrazione per essere inclusa in index.html
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/ngsw-worker.js')
      .then(function(reg) { console.log('Service Worker registrato', reg); })
      .catch(function(err) { console.warn('Service Worker registration failed:', err); });
  });
}
