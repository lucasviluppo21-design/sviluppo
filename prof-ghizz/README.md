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

0 - funzionalità anteprima pdf  
1 - funzionalità di stampa scheda
2 - ridotto la dimensione delle label min serc, recupero e ripetizioni
3 - ho aggiunto la paginazione alla schede deglie esercizi 
4 - ho aggiunto il filtro per cercare le catergorie quando si inserisce l'esercizio in modo da non avere un menu con molti elementi 
5 - ho associato la scheda all'utente nel dettaglio anagrafica 


annotazione una riga di 10 celle 

https://firebase.google.com/
https://console.cloud.google.com/storage/browser (attivazione storage)

node_modules/
dist/
/.angular
/.idea
*.log


