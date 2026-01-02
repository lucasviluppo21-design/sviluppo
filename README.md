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

https://firebase.google.com/

https://console.cloud.google.com/storage/browser (attivazione storage)

tessera scaduta due tre giorni prima 

DEPLOY APPLICAZIONE :
# 1) Build dall'Angular workspace con base-href corretto
cd prof-ghizz
ng build --configuration production --base-href "/sviluppo/"
cd ..

# 2) Percorsi della build
ls -la prof-ghizz/dist/prof-ghizz-app
ls -la prof-ghizz/dist/prof-ghizz-app/browser   # <-- qui deve esserci index.html

# 3) Deploy pulito in docs (copiamo dalla cartella browser/)
rm -rf docs
mkdir -p docs
cp -r prof-ghizz/dist/prof-ghizz-app/browser/* docs/

# 4) SPA fallback (necessario per le rotte Angular su Pages)
cp docs/index.html docs/404.html

# 5) Disabilita Jekyll
touch docs/.nojekyll

# 6) (Opzionale) Rimuovi i file PWA per evitare cache SW su Pages
rm -f docs/ngsw-worker.js docs/ngsw.json docs/worker-basic.min.js docs/safety-worker.js docs/manifest.webmanifest

# 7) Commit e push
git add docs
git commit -m "Deploy Angular build (copy from dist/prof-ghizz-app/browser to docs; base-href /sviluppo/)"
git push
