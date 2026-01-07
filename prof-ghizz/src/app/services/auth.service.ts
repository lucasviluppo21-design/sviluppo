import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _ensuring: Promise<void> | null = null;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router
  ) {}

  /** Ensure there is a signed-in user. If none, attempt anonymous sign-in and wait for auth state. */
  async ensureSignedIn(): Promise<void> {
    if (this._ensuring) return this._ensuring;

    this._ensuring = (async () => {
      const current = await this.afAuth.currentUser;
      if (current) return;
      try {
        await this.afAuth.signInAnonymously();
        // wait until authState emits a user (gives slightly more guarantee)
        await new Promise<void>((resolve) => {
          const sub = this.afAuth.authState.subscribe(u => {
            if (u) {
              sub.unsubscribe();
              resolve();
            }
          });
          // safety timeout
          setTimeout(() => { sub.unsubscribe(); resolve(); }, 5000);
        });
      } catch (err) {
        console.error('AuthService.ensureSignedIn failed', err);
      }
    })();

    try {
      await this._ensuring;
    } finally {
      this._ensuring = null;
    }
  }

  /** Logout dell'utente */
  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Errore durante il logout:', err);
    }
  }

  /** Ottiene lo stato di autenticazione corrente */
  get authState() {
    return this.afAuth.authState;
  }

  /** Ottiene l'utente attualmente loggato */
  get currentUser() {
    return this.afAuth.currentUser;
  }
}

