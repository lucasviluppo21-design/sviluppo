import { Injectable } from '@angular/core';

// Importa i servizi 'compat' di AngularFire come configurato in AppModule
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Interfaccia per i dati della Scheda di allenamento
// **NOTA:** Questa interfaccia è fondamentale per la tipizzazione dei dati.
export interface Scheda {
  id?: string; // L'ID è opzionale, usato solo in lettura
  nome: string;
  dataCreazione: Date;
  idCliente: string; // Riferimento all'utente/cliente
  esercizi: any[]; // Array di esercizi, potresti voler creare un'interfaccia "Esercizio" più specifica
}

@Injectable({
  // providedIn: 'root' assicura che il servizio sia un singleton
  providedIn: 'root'
})
export class FirebaseService {

  // Riferimento alla collezione principale 'schede'
  private schedeCollection: AngularFirestoreCollection<Scheda>;

  /**
   * Costruttore: iniettiamo i servizi Firebase resi disponibili da AppModule.
   */
  constructor(
    private firestore: AngularFirestore, // Firestore per il database
    private auth: AngularFireAuth,       // Auth per l'autenticazione
    private storage: AngularFireStorage  // Storage per i file (es. immagini profilo)
  ) {
    // legacy: AuthService will handle sign-in when needed
    // Inizializza il riferimento alla collezione Firestore.
    // Il nome della collezione nel database sarà 'schede'.
    this.schedeCollection = this.firestore.collection<Scheda>('schede');
  }

  /** Test helper: esegue una scrittura di debug su Firestore dopo avere assicurato l'autenticazione anonima. */
  async testWrite(): Promise<{ ok: boolean; id?: string; error?: any }> {
    try {
      // se AuthService esiste, usalo; altrimenti prova signIn anonimo tramite compat
      try {
        // preferiamo usare auth compat se disponibile
        const cur = await this.auth.currentUser;
        if (!cur) await this.auth.signInAnonymously();
      } catch (e) {
        // ignore
      }
      const ref = await this.schedeCollection.add({ nome: 'debug-' + Date.now(), dataCreazione: new Date(), idCliente: 'debug', esercizi: [] } as any);
      return { ok: true, id: ref.id };
    } catch (error) {
      console.error('FirebaseService.testWrite error', error);
      return { ok: false, error };
    }
  }

  // --- Operazioni CRUD per la collezione 'schede' ---

  /**
   * Ottiene tutte le schede e le aggiorna in tempo reale (come Observable).
   * Mappa i dati per includere l'ID del documento.
   * @returns Observable<Scheda[]> - Una lista di schede di allenamento.
   */
  getSchede(): Observable<Scheda[]> {
    return this.schedeCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        // Ottiene i dati del documento
        const data = a.payload.doc.data() as Scheda;
        // Ottiene l'ID del documento
        const id = a.payload.doc.id;
        // Restituisce l'oggetto Scheda completo di ID per l'uso nel componente
        return { id, ...data };
      }))
    );
  }

  /**
   * Ottiene una singola scheda tramite ID.
   * @param id L'ID della scheda da recuperare.
   * @returns Observable<Scheda | undefined>
   */
  getScheda(id: string): Observable<Scheda | undefined> {
    // valueChanges() non include l'ID per default, quindi lo aggiungiamo con 'map'
    return this.schedeCollection.doc<Scheda>(id).valueChanges().pipe(
      map(data => data ? { ...data, id } as Scheda : undefined)
    );
  }


  /**
   * Aggiunge una nuova scheda alla collezione.
   * @param scheda I dati della scheda da salvare.
   * @returns Promise<any> - Ritorna una Promise con il riferimento al documento creato.
   */
  addScheda(scheda: Scheda): Promise<any> {
    return this.schedeCollection.add(scheda);
  }

  /**
   * Aggiorna i dati di una scheda esistente.
   * @param id L'ID della scheda da aggiornare.
   * @param scheda I dati parziali o completi da aggiornare (usa Partial<T> per aggiornamenti parziali).
   * @returns Promise<void>
   */
  updateScheda(id: string, scheda: Partial<Scheda>): Promise<void> {
    return this.schedeCollection.doc(id).update(scheda);
  }

  /**
   * Cancella una scheda dal database.
   * @param id L'ID della scheda da cancellare.
   * @returns Promise<void>
   */
  deleteScheda(id: string): Promise<void> {
    return this.schedeCollection.doc(id).delete();
  }
}