import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
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
  private sub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
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
  }
}