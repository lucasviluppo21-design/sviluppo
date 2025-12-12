import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false,
})
export class HeaderComponent implements OnInit, OnDestroy {
  private deferredPrompt: any = null;
  canInstall = false;
  isStandalone = false;

  // Versione dall'environment
  appVersion = environment.version;

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    const handler = (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as any;
      this.zone.run(() => {
        this.canInstall = true;
      });
      console.log('[PWA] beforeinstallprompt ricevuto, canInstall=true');
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      this.zone.run(() => {
        this.canInstall = false;
        this.isStandalone = true;
      });
      this.deferredPrompt = null;
      console.log('[PWA] appinstalled: installazione completata');
    });
  }

  ngOnDestroy(): void {
    // opzionale: rimuovere i listener se necessario
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) {
      alert('Installazione non disponibile ora. Ricarica la pagina e riprova.');
      return;
    }
    this.canInstall = false;
    this.deferredPrompt.prompt();
    try {
      const choice = await this.deferredPrompt.userChoice;
      console.log('[PWA] userChoice:', choice);
    } finally {
      this.deferredPrompt = null;
    }
  }
}