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

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    // Detect standalone (già installata/avviata)
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    // Fallback: se il browser supporta service worker + manifest, mostra link (non prompt)
    const supportsSW = 'serviceWorker' in navigator;
    const supportsManifest = !!document.querySelector('link[rel="manifest"]');
    if (supportsSW && supportsManifest && !this.isStandalone) {
      // Non garantisce il prompt, ma consente UI
      this.canInstall = false; // verrà true solo con beforeinstallprompt
      console.log('[PWA] supporto rilevato, in attesa di beforeinstallprompt…');
    }

    // Evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as any;
      this.zone.run(() => {
        this.canInstall = true;
      });
      console.log('[PWA] beforeinstallprompt ricevuto, canInstall=true');
    };
    window.addEventListener('beforeinstallprompt', handler);

    // App installed
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
    // Non rimuovo i listener per semplicità, se lo fai, tieni una reference al handler
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) {
      alert('Installazione non disponibile ora. Riprova dopo aver ricaricato la pagina.');
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