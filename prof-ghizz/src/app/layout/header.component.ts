import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';

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

  private beforeInstallHandler = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as any;
    // Aggiorna stato UI dentro Angular
    this.zone.run(() => {
      this.canInstall = true;
    });
  };

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    // Rileva se l'app è avviata in standalone (già installata)
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;

    // Ascolta l'evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', this.beforeInstallHandler);

    // Se la pagina è ricaricata dopo installazione, nascondi il bottone
    window.addEventListener('appinstalled', () => {
      this.zone.run(() => {
        this.canInstall = false;
        this.isStandalone = true;
      });
      this.deferredPrompt = null;
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallHandler);
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;

    this.canInstall = false;
    // Mostra il prompt
    this.deferredPrompt.prompt();
    try {
      const choice = await this.deferredPrompt.userChoice;
      // choice.outcome: 'accepted' | 'dismissed'
      // In ogni caso, resetta il prompt
      this.deferredPrompt = null;
    } catch {
      this.deferredPrompt = null;
    }
  }
}