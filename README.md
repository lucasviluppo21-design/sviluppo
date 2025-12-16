# sviluppo

## Angular PWA App — scaffold

Questo repository contiene una struttura minima per iniziare un'app Angular PWA.

Passi consigliati per iniziare (da terminale):

```bash
# installare le dipendenze
npm install

# eseguire in sviluppo (richiede @angular/cli)
npx ng serve --open

# costruire per produzione
npx ng build --configuration production

# aggiungere PWA ufficiale (registra service worker e genera ngsw-worker.js)
npx ng add @angular/pwa --project app
```

Nota: lo scaffold contiene `manifest.webmanifest` e `ngsw-config.json` di base. Per attivare
completamente il service worker usare `ng add @angular/pwa` oppure generare `ngsw-worker.js` con
la build di Angular CLI.

NOTE PER ENZO SVILUPPI:

- eliminare dalla stampa nelle note utente la suddivisione in celle
- nella gestione delle stampe creare un nuovo template vedi mail enzo 
- nella pagina di dettaglio utente ho isnerito la data scadenza abbonamento palestra , su cui poi andremo a costruire una pagina 
  in cui visualizziamo tutte le scadenze delle iscrizioni a cui inviare una mail all'utente o um msg su cell nela caso in cui scade.


annotazione una riga di 10 celle 

https://firebase.google.com/

https://console.cloud.google.com/storage/browser (attivazione storage)

tessera scaduta due tre giorni prima 


