Suggerimenti per esporre i PDF in modo pubblico (senza rendere pubblici tutti i documenti utente)

Problema:
- I PDF sono attualmente memorizzati come base64 in `users/{userId}.cards[index].pdfBase64`.
- Mettere l'intero documento `users/{userId}` in lettura pubblica potrebbe esporre dati sensibili.

Opzioni consigliate (ordina per semplicità/riservatezza):

1) Collection pubblica dedicata (consigliata)
- Creare una collection `publicCards` dove ogni documento ha almeno i campi:
  - `ownerUid` (ID utente), `cardIndex`, `pdfBase64`, `createdAt`, opzionale `ttl`/`expiresAt` o `public=true`.
- Regole Firestore:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /publicCards/{docId} {
      // Lettura pubblica (chiunque può aprire il PDF)
      allow read: if true;

      // Scrittura consentita solo all'utente proprietario (o a ruoli server autorizzati)
      allow create, update, delete: if request.auth != null && request.auth.uid == request.resource.data.ownerUid;
    }

    // Proteggi la collection users come prima (solo accesso controllato).
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Vantaggi: semplice, non sveli altri dati utente, facile da invalidare (basta rimuovere il doc).

2) Documenti pubblici specifici per scheda (meno raccomandato ma possibile)
- Creare `usersPublic/{userId}/cards/{cardIndex}` solo per le schede che devono essere pubbliche.
- Regole: leggere la specifica sotto-collection pubblica.

3) Token/endpoint serverless (se non vuoi dati pubblici in Firestore)
- Implementare una Cloud Function che riceve una richiesta con un id sicuro (JWT o token breve) e ritorna il PDF.
- Permette revoca e logging centralizzato.

Implementazione e passaggi consigliati:
- Preferisco la soluzione (1): aggiungi logica lato client/server che, dopo la generazione del PDF, scriva anche un documento in `publicCards` (come fa già il componente `public-pdf` con il tentativo "best-effort" di aggiornare `cards` nel DB).
- Aggiorna la procedura `PublicPdfComponent` in produzione: scrivi in `publicCards/{userId}_{cardIndex}` con `pdfBase64` se vuoi che il PDF sia permanenente.
- Aggiorna le regole Firestore e testale con l'emulatore Firebase prima di andare in produzione.

Se vuoi, posso:
- generare il codice di esempio per la scrittura in `publicCards` (client-side o cloud function);
- preparare una regola `firestore.rules` pronta da caricare;
- darti i passi per testare con l'emulatore locale (consigliato).

