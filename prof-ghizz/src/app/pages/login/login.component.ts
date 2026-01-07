import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';
  showPassword: boolean = false;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Se l'utente è già loggato, redirect alla home
    this.afAuth.currentUser.then(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async login(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Email e password sono obbligatori';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // Login con email e password
      const result = await this.afAuth.signInWithEmailAndPassword(
        this.email.trim(),
        this.password.trim()
      );

      if (result.user) {
        // Login riuscito, redirect alla home
        this.router.navigate(['/']);
      }
    } catch (err: any) {
      this.loading = false;
      // Gestione errori specifici di Firebase
      const errorCode = err.code;
      const errorMessage = err.message;

      switch (errorCode) {
        case 'auth/invalid-email':
          this.error = 'Email non valida';
          break;
        case 'auth/user-disabled':
          this.error = 'Questo account è stato disabilitato';
          break;
        case 'auth/user-not-found':
          this.error = 'Email non trovata';
          break;
        case 'auth/wrong-password':
          this.error = 'Password non corretta';
          break;
        case 'auth/too-many-requests':
          this.error = 'Troppi tentativi di accesso. Riprova più tardi';
          break;
        default:
          this.error = 'Errore di accesso: ' + errorMessage;
      }
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}
