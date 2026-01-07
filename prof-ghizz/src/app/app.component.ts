import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  isPublic = false;
  isLoggedIn = false;
  private sub?: Subscription;
  private authSub?: Subscription;

  constructor(
    private router: Router,
    private afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    // Controlla stato login
    this.authSub = this.afAuth.authState.subscribe(user => {
      this.isLoggedIn = !!user;
    });

    // stato iniziale (deep link diretto)
    this.isPublic = this.router.url.includes('/public-pdf/');

    // aggiorna ad ogni navigazione
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.isPublic = this.router.url.includes('/public-pdf/');
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.authSub?.unsubscribe();
  }
}