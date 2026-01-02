import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { PdfSchedaService } from '../services/pdf-scheda-service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-public-pdf',
  templateUrl: './public-pdf.component.html',
  styleUrls: ['./public-pdf.component.css']
})
export class PublicPdfComponent implements OnInit {
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private pdfSchedaService: PdfSchedaService,
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.route.snapshot.paramMap.get('userId');
    const cardIndexRaw = this.route.snapshot.paramMap.get('cardIndex');
    const cardIndex = cardIndexRaw ? Number(cardIndexRaw) : NaN;

    if (!userId || Number.isNaN(cardIndex)) {
      this.setError('Link non valido: dati mancanti.');
      return;
    }

    try {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        this.setError('Utente non trovato.');
        return;
      }

      const user = userSnap.data() as any;
      const card = user.cards?.[cardIndex];
      if (!card) {
        this.setError('Scheda non trovata.');
        return;
      }

      // If pdfBase64 is available, open it directly
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
          // Open in same tab so scanner opens the PDF directly
          window.location.href = url;
          // revoke after some time
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return;
        } catch (err) {
          console.error('Errore apertura PDF da base64', err);
          // continue to attempt building the PDF
        }
      }

      // If PDF isn't stored, build it, open it and try to save base64 to DB
      const docPdf: any = await this.pdfSchedaService.buildDoc(card, user);

      // Try to get blob from jsPDF
      let blob: Blob;
      try {
        // some jsPDF versions support output('blob')
        blob = docPdf.output && typeof docPdf.output === 'function' ? docPdf.output('blob') : undefined;
      } catch (e) {
        blob = undefined as any;
      }
      if (!blob) {
        // fallback to arraybuffer
        const arr = docPdf.output('arraybuffer');
        blob = new Blob([arr], { type: 'application/pdf' });
      }

      // Open PDF immediately
      const pdfUrl = URL.createObjectURL(blob);
      window.location.href = pdfUrl;
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);

      // Convert blob to base64 and try saving to DB (best-effort)
      try {
        const arrayBuffer = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.prototype.slice.call(chunk));
        }
        const base64 = btoa(binary);

        // Update the user's cards array with the new pdfBase64
        try {
          // Ensure signed in before attempting to write
          await this.authService.ensureSignedIn();
          const updatedCards = Array.isArray(user.cards) ? [...user.cards] : [];
          updatedCards[cardIndex] = { ...updatedCards[cardIndex], pdfBase64: base64 };
          await updateDoc(userDocRef, { cards: updatedCards });
        } catch (e) {
          // ignore write errors
          console.warn('Impossibile salvare PDF nel DB (permessi mancanti?):', e);
        }
      } catch (e) {
        console.warn('Impossibile convertire PDF in base64:', e);
      }
    } catch (e) {
      console.error('Errore caricamento dati:', e);
      this.setError('Errore di caricamento dati.');
    }
  }

  private setError(msg: string): void {
    this.loading = false;
    this.error = msg;
  }
}
