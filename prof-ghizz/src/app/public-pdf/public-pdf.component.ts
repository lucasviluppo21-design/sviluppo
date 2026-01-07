import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { PdfSchedaService } from '../services/pdf-scheda-service';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-pdf',
  templateUrl: './public-pdf.component.html',
  styleUrls: ['./public-pdf.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PublicPdfComponent implements OnInit {
  message = 'Sto aprendo il PDF...';

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private pdfSchedaService: PdfSchedaService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId') || '';
    const cardIndexStr = this.route.snapshot.paramMap.get('cardIndex') || '0';
    const cardIndex = parseInt(cardIndexStr, 10);

    if (!userId) {
      this.message = 'ID utente mancante.';
      return;
    }

    // First try a public copy under publicCards/{userId}_{cardIndex}
    const pubId = `${userId}_${cardIndex}`;
    const pubDoc = doc(this.firestore, `publicCards/${pubId}`);

    docData(pubDoc).pipe(take(1)).subscribe((p: any) => {
      if (p?.pdfBase64) {
        try {
          const bc = atob(p.pdfBase64);
          const bn = new Array(bc.length);
          for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
          const ba = new Uint8Array(bn);
          const b = new Blob([ba], { type: 'application/pdf' });
          const uurl = URL.createObjectURL(b);
          // Navigate to the blob URL in the current tab so the PDF opens directly
          window.location.assign(uurl);
          // Note: revocation after navigation may not run; it's acceptable here
          this.message = 'Aperto il PDF.';
          return;
        } catch (err) {
          console.error('Errore apertura PDF da base64 (pubblicato)', err);
        }
      }

      // If no public copy found, fallback to user's private doc
      const userDoc = doc(this.firestore, `users/${userId}`);

      docData(userDoc).pipe(take(1)).subscribe(async (u: any) => {
        if (!u) {
          this.message = 'Utente non trovato.';
          return;
        }

        const cards = Array.isArray(u.cards) ? u.cards : [];
        const card = cards[cardIndex];
        if (!card) {
          this.message = 'Scheda non trovata.';
          return;
        }

        // If pdfBase64 already present open it
        if (card.pdfBase64 && card.pdfBase64.length > 0) {
          try {
            const byteCharacters = atob(card.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            // Navigate to the blob URL in the current tab
            window.location.assign(url);
            this.message = 'Aperto il PDF.';
            return;
          } catch (err) {
            console.error('Errore apertura PDF da base64', err);
          }
        }

        // else try to build and save the PDF then open it
        try {
          await this.pdfSchedaService.buildAndSavePdf(card, { ...u, id: userId });
          // Re-fetch once to obtain the saved pdfBase64
          docData(userDoc).pipe(take(1)).subscribe((refreshed: any) => {
            const refreshedCard = Array.isArray(refreshed?.cards) ? refreshed.cards[cardIndex] : null;
            if (refreshedCard?.pdfBase64) {
              try {
                const bc = atob(refreshedCard.pdfBase64);
                const bn = new Array(bc.length);
                for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
                const ba = new Uint8Array(bn);
                const b = new Blob([ba], { type: 'application/pdf' });
                const uurl = URL.createObjectURL(b);
                window.open(uurl, '_blank');
                setTimeout(() => URL.revokeObjectURL(uurl), 60_000);
                this.message = 'Aperto il PDF in una nuova scheda.';
                return;
              } catch (err) {
                console.error('Errore apertura PDF dopo build', err);
              }
            }
            this.message = 'PDF generato ma non disponibile per l’apertura.';
          });
        } catch (err) {
          console.error('Errore durante la generazione del PDF pubblico', err);
          this.message = 'Errore durante la generazione del PDF.';
        }
      }, err => {
        console.error('Errore lettura utente', err);
        // Detect permission errors and give clearer message
        if (err && err.code === 'permission-denied') {
          this.message = 'Questa scheda non è pubblica. Se sei il proprietario, effettua il login e usa il pannello di condivisione per "Rendi pubblica".';
        } else {
          this.message = 'Errore accesso dati utente.';
        }
      });
    }, err => {
      console.error('Errore lettura publicCards', err);
      // If public access blocked or not found, fallback to user doc (handled above)
      // But show a helpful message if permission denied
      if (err && err.code === 'permission-denied') {
        // continue to fallback but inform user
        this.message = 'La scheda non è pubblica. Se sei il proprietario, usa il pannello di condivisione per pubblicarla.';
      }
    });
  }
}
