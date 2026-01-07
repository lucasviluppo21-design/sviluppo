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
  userId = '';
  nome = '';
  cognome = '';
  showEditModal = false;
  showDeleteModal = false;
  editForm: Partial<User & { avatarFile?: File }> = {};
  avatarLoading = false;
  userSub?: Subscription;
  today: string = new Date().toISOString().substring(0, 10);
  filterExpiredOnly = false;
  showShareMenu = false;
  publicShareUrl = "";
  selectedCardIndex: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pdfSchedaService: PdfSchedaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idFromRoute = params.get('id');
      if (!idFromRoute) return;
      this.userId = idFromRoute;
      this.getUser();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  getUser() {
    if (!this.userId) return;
    const userDoc = doc(this.firestore, `users/${this.userId}`);
    this.userSub?.unsubscribe();
    this.userSub = docData(userDoc).subscribe(u => {
      if (!u) return;
      const asUser = { ...u, id: this.userId } as User;
      if (Array.isArray(asUser.cards)) {
        asUser.cards = (asUser.cards as WorkoutCard[]).sort((a, b) => {
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
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
    let hh = 0, min = 0;
    if (t) {
      const tm = t.match(/^(\d{2}):(\d{2})/);
      if (tm) { hh = Number(tm[1]); min = Number(tm[2]); }
    }
    return new Date(yyyy, mm, dd, hh, min);
  }

  isExpired(subscriptionEnd?: string): boolean {
    if (!subscriptionEnd) return false;
    return subscriptionEnd <= this.today;
  }

  async updateSubscriptionEnd(newDate: string): Promise<void> {
    if (!this.user?.id) return;
    try {
      await this.authService.ensureSignedIn();
      const userDocRef = doc(this.firestore, `users/${this.user.id}`);
      await updateDoc(userDocRef, { subscriptionEnd: newDate || '' });
    } catch (err) {
      alert('Errore durante l’aggiornamento.');
    }
  }

  async deleteCard(cardIndex: number) {
    if (!this.user || !this.user.id) return;
    const cards = [...(this.user.cards || [])];
    cards.splice(cardIndex, 1);
    const userDoc = doc(this.firestore, `users/${this.user.id}`);
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(userDoc, { cards });
    } catch {}
  }

  // MODAL EDIT/DELETE
  openEditModal(): void {
    if (!this.user) return;
    this.editForm = { ...this.user };
    const parts = (this.user.name || '').trim().split(' ');
    this.nome = parts[0] || '';
    this.cognome = parts.slice(1).join(' ') || '';
    this.showEditModal = true;
  }
  closeEditModal(): void { this.showEditModal = false; }

  async onAvatarChange(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    this.avatarLoading = true;
    const base64 = await this.imageService.compressAndConvertToBase64(file, 1000, 256) as any;
    this.editForm.avatarUrl = base64;
    this.avatarLoading = false;
  }

  triggerAvatarInput(input: HTMLInputElement): void { input.click(); }

  async saveEditModal(): Promise<void> {
    if (!this.user?.id) return;
    const fullName = `${this.nome} ${this.cognome}`.trim();
    const updated: Partial<User> = {
      ...this.editForm,
      name: fullName
    };
    delete (updated as any).avatarFile;
    try {
      await this.authService.ensureSignedIn();
      await updateDoc(doc(this.firestore, `users/${this.user.id}`), updated);
      this.closeEditModal();
    } catch { alert('Errore aggiornamento.'); }
  }

  async printCard(index: number): Promise<void> {
    if (!this.user?.cards?.[index]) return;
    const card = this.user.cards[index] as WorkoutCard;
    if (card.pdfBase64) {
      const byteCharacters = atob(card.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
      return;
    }
    try {
      await this.pdfSchedaService.buildAndSavePdf(card, this.user);
    } catch { alert('Errore stampa PDF'); }
  }

  get filteredCards(): WorkoutCard[] {
    return (this.user?.cards as WorkoutCard[]) || [];
  }

  async deleteUserCustom(): Promise<void> {
    if (!this.user?.id) return;
    try {
      await this.authService.ensureSignedIn();
      await deleteDoc(doc(this.firestore, `users/${this.user.id}`));
      this.router.navigate(['/anagrafica/list']);
    } catch {}
  }

  openDeleteModal(): void { this.showDeleteModal = true; }
  closeDeleteModal(): void { this.showDeleteModal = false; }
  
  


}