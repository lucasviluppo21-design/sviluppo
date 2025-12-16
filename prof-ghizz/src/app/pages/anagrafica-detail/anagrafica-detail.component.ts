import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PdfSchedaService } from '../../services/pdf-scheda-service';
import { Firestore, doc, docData, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { User, WorkoutCard } from '../../models/user.model';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-anagrafica-detail',
  templateUrl: './anagrafica-detail.component.html',
  styleUrls: ['./anagrafica-detail.component.css'],
  standalone: false
})
export class AnagraficaDetailComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private imageService = inject(ImageService);

  user?: User;
  showEditModal = false;
  showDeleteModal = false;
  editForm: Partial<User & { avatarFile?: File }> = {};
  nome = '';
  cognome = '';
  userId: string = '';
  userSub?: Subscription;
  avatarLoading: boolean = false;

  filterExpiredOnly: boolean = false;
  today: string = new Date().toISOString().substring(0, 10);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pdfSchedaService: PdfSchedaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idFromRoute = params.get('id');
      if (!idFromRoute) {
        this.userId = '';
        this.user = undefined;
        return;
      }
      this.userId = idFromRoute;
      this.getUser();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  getUser() {
    if (!this.userId) {
      this.user = undefined;
      return;
    }
    const userDoc = doc(this.firestore, `users/${this.userId}`);
    this.userSub?.unsubscribe();
    this.userSub = docData(userDoc).subscribe(u => {
      if (!u) return;
      const asUser = { ...u, id: this.userId } as User;
      if (Array.isArray(asUser.cards)) {
        asUser.cards = asUser.cards.sort((a, b) => {
          const aDate = this.parseItDateTime(a.date, a.time);
          const bDate = this.parseItDateTime(b.date, b.time);
          return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
        });
      }
      this.user = asUser;
    });
  }

  private parseItDateTime(d?: string, t?: string): Date | undefined {
    if (!d) return;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return;
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yyyy = Number(m[3]);
    let hh = 0, min = 0, ss = 0;
    if (t) {
      const tm = t.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (tm) {
        hh = Number(tm[1]);
        min = Number(tm[2]);
        ss = tm[3] ? Number(tm[3]) : 0;
      }
    }
    return new Date(yyyy, mm, dd, hh, min, ss);
  }

  isExpired(subscriptionEnd?: string): boolean {
    if (!subscriptionEnd) return false;
    return subscriptionEnd <= this.today;
  }

  async deleteCard(cardIndex: number) {
    if (!this.user || !this.user.id) return;
    const cards = Array.isArray(this.user.cards) ? [...this.user.cards] : [];
    cards.splice(cardIndex, 1);

    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(userDoc, { cards });
      this.user.cards = cards;
    } catch (err) {
      console.error('Error deleting card', err);
    }
    this.getUser();
  }

  openEditModal(): void {
    if (!this.user || !this.user.id) return;
    this.editForm = {
      ...this.user,
      avatarFile: undefined
    };
    const parts = (this.user.name || '').trim().split(' ');
    this.nome = parts[0] || '';
    this.cognome = parts.slice(1).join(' ') || '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editForm = {};
    this.nome = '';
    this.cognome = '';
    this.avatarLoading = false;
  }

  async onAvatarChange(event: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    this.avatarLoading = true;
    this.editForm.avatarFile = file;
    this.editForm.avatarUrl = await this.imageService.compressAndConvertToBase64(file, 1000, 256);
    this.avatarLoading = false;
  }

  triggerAvatarInput(input: HTMLInputElement): void {
    input.click();
  }

  async saveEditModal(): Promise<void> {
    if (!this.user || !this.user.id) {
      alert('ID utente mancante, impossibile aggiornare!');
      return;
    }
    const fullName = `${this.nome || ''} ${this.cognome || ''}`.trim();
    if (!fullName || !this.editForm.email) {
      alert('Compila almeno Nome, Cognome ed Email.');
      return;
    }
    const updated: Partial<User> = {
      name: fullName,
      email: this.editForm.email ?? '',
      phone: this.editForm.phone ?? '',
      birthDate: this.editForm.birthDate ?? '',
      gender: this.editForm.gender ?? '',
      address: this.editForm.address ?? '',
      city: this.editForm.city ?? '',
      provincia: this.editForm.provincia ?? '',
      cap: this.editForm.cap ?? '',
      personalNotes: this.editForm.personalNotes ?? '',
      subscriptionEnd: this.editForm.subscriptionEnd ?? '',
      avatarUrl: this.editForm.avatarUrl ?? this.user.avatarUrl ?? '',
      signupDate: this.user.signupDate ?? '',
      status: this.editForm.status ?? this.user.status ?? '',
      cards: this.user.cards ?? []
    };
    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(userDoc, updated);
      this.user = { ...this.user, ...updated };
    } catch (err) {
      console.error('Error updating user', err);
      alert('Errore aggiornamento utente. Riprova.');
    }
    this.closeEditModal();
  }

  async printCard(index: number): Promise<void> {
    if (!this.user || !this.user.cards || !this.user.cards[index]) return;
    const card = this.user.cards[index] as WorkoutCard;

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
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      } catch (err) {
        console.error('Errore apertura PDF da base64, fallback al builder', err);
      }
    }

    try {
      await this.pdfSchedaService.buildAndSavePdf(card, this.user);
    } catch (err) {
      console.error('Errore durante la stampa della scheda', err);
      alert('Errore durante la stampa della scheda');
    }
  }

  async updateCardAbbonamentoEndDate(index: number, value: string): Promise<void> {
    if (!this.user || !this.user.cards || !this.user.cards[index] || !this.user.id) return;
    this.user.cards[index].abbonamentoEndDate = value;
    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(userDoc, { cards: this.user.cards });
    } catch (err) {
      console.error('Errore aggiornamento scadenza tessera scheda', err);
      alert('Impossibile salvare la nuova scadenza della tessera!');
    }
  }

  async updateSubscriptionEnd(value: string): Promise<void> {
    if (!this.user?.id) return;
    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(userDoc, { subscriptionEnd: value });
      this.user.subscriptionEnd = value;
    } catch (err) {
      console.error('Errore aggiornamento scadenza tessera', err);
      alert('Impossibile salvare la nuova scadenza!');
    }
  }

  openWhatsAppWithMessage(): void {
    if (!this.user?.phone || !this.user?.subscriptionEnd) return;
    const msg = `Ciao ${this.user.name}, la tua tessera scade il giorno ${this.user.subscriptionEnd}. Provvedi al rinnovo.`;
    const whatsappURL = `https://wa.me/${this.user.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappURL, '_blank');
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  async deleteUserCustom(): Promise<void> {
    if (!this.user || !this.user.id) return;
    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await deleteDoc(userDoc);
    } catch (err) {
      console.error('Error deleting user', err);
    }
    this.closeDeleteModal();
    this.router.navigate(['/anagrafica']);
  }

  get filteredCards(): WorkoutCard[] {
    if (!this.user?.cards) return [];
    if (!this.filterExpiredOnly) return this.user.cards as WorkoutCard[];
    return (this.user.cards as WorkoutCard[]).filter(card => card.abbonamentoEndDate && card.abbonamentoEndDate <= this.today);
  }
}