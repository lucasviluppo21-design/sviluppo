# Componente di Login

## Descrizione
La componente di login fornisce un'interfaccia sicura per l'autenticazione degli utenti nel sistema Prof Ghizz. Verifica le credenziali (email e password) direttamente con Firebase Authentication.

## Features
- ✅ Autenticazione email/password con Firebase
- ✅ Gestione degli errori di login specifici
- ✅ Mostra/nascondi password
- ✅ Loading state con spinner
- ✅ Design responsivo e moderno
- ✅ Accesso tramite Enter
- ✅ Protezione delle rotte con AuthGuard
- ✅ Logout da header

## File della Componente
- `login.component.ts` - Logica di login
- `login.component.html` - Template
- `login.component.css` - Stili
- `auth.guard.ts` - Guard per proteggere le rotte

## Utilizzo

### Flusso di Autenticazione

1. **Accesso non autenticato**: Quando l'utente non è loggato, viene reindirizzato a `/login`
2. **Login**: L'utente inserisce email e password
3. **Verifica**: Le credenziali vengono verificate con Firebase
4. **Redirect**: Se valide, l'utente viene reindirizzato alla home
5. **Logout**: Il pulsante "Esci" nell'header consente il logout

### Rotte Protette
Tutte le rotte tranne `/login` richiedono autenticazione tramite `AuthGuard`:
- `/` (Home)
- `/anagrafica` (Clienti)
- `/esercizi` (Esercizi)
- `/gestione-schede` (Schede)

### Gestione Errori
La componente gestisce i seguenti errori Firebase:
- `auth/invalid-email` → "Email non valida"
- `auth/user-not-found` → "Email non trovata"
- `auth/wrong-password` → "Password non corretta"
- `auth/user-disabled` → "Account disabilitato"
- `auth/too-many-requests` → "Troppi tentativi, riprova più tardi"

## CSS
Il componente include uno stile moderno con:
- Gradient background
- Animazioni smooth
- Responsive design mobile-first
- Feedback visivo su hover e focus
- Loading spinner animato

## AuthService
Il servizio `auth.service.ts` è stato esteso con:
- `logout()` - Esegue il logout e reindirizza a `/login`
- `authState` - Observable dello stato di autenticazione
- `currentUser` - Promise dell'utente corrente

## Integration con Header
Il componente `header.component.ts` include un pulsante logout rosso che:
- Chiama `authService.logout()`
- Mostra solo l'icona su mobile
- Mostra icona + testo "Esci" su desktop
- Ha effetti hover e attivo

## Sicurezza
- Le password non vengono mai salvate localmente
- La verifica è gestita direttamente da Firebase
- Tutte le rotte non-login sono protette da AuthGuard
- Il logout cancella la sessione Firebase

## Testing

Per testare il login:
1. Creare un utente in Firebase Authentication
2. Navigare a `/login`
3. Inserire email e password
4. Se corretti, viene reindirizzato alla home
5. Il pulsante "Esci" nell'header esegue il logout

