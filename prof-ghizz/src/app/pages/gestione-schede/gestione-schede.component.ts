import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PdfSchedaService } from '../../services/pdf-scheda-service';
import { AuthService } from '../../services/auth.service';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc
} from '@angular/fire/firestore';
import { User, WorkoutCard } from '../../models/user.model';

interface ScheduleExercise {
  id: string;
  nome: string;
  image?: string;
  categoria?: string;
  serie: number;
  ripetizioni: number;
  minuti: number;
  secondi: number;
  caricoKg: number;
  note: string;
}
interface Giorno {
  nome: string;
  esercizi: ScheduleExercise[];
  editing?: boolean;
}
interface Scheda {
  id?: string;
  userId?: string;
  stato: string;
  livello: string;
  durata: string;
  dataInizio: string;
  orario?: string;
  giorni: Giorno[];
  createdAt?: number;
}

@Component({
  selector: 'app-gestione-schede',
  templateUrl: './gestione-schede.component.html',
  styleUrls: ['./gestione-schede.component.css'],
  standalone: false
})
export class GestioneSchedeComponent implements OnInit {
  private firestore = inject(Firestore);

  constructor(
    private router: Router,
    private pdfSchedaService: PdfSchedaService,
    private authService: AuthService
  ) {}

  cliente: User | null = null;
  scheda: Scheda = {
    stato: 'In preparazione',
    livello: 'Intermedio',
    durata: '4 Settimane',
    dataInizio: '',
    orario: '',
    giorni: [{ nome: 'Giorno 1', esercizi: [] }]
  };

  // Logo locale, NON salvato nel DB/Storage
  logoPreviewUrl: string | null = null;
  tempLogoFile: File | null = null;

  giornoAttivoIndex = 0;
  esercizi: Array<{ id: string; name: string; category: string; image?: string }> = [];
  categorie: Array<{ id: string; name: string; image?: string; selected?: boolean }> = [];
  eserciziFiltrati: Array<{ id: string; name: string; category: string; image?: string }> = [];
  searchTerm = '';
  filterCategoria = '';
  allUsers: User[] = [];
  filteredUserList: User[] = [];
  userSearch = '';
  showUserPicker = false;
  shareModalOpen = false;
  generatedLink = '';
  oggi = new Date().toISOString().split('T')[0];
  pdfBlobUrl: string | null = null;

  currentExercisePage = 0;
  pageSize = 3;

  showSavedMsg = false;
  savedMsgText = 'Scheda salvata';

  get pagedExercises() {
    const esercizi = this.scheda.giorni[this.giornoAttivoIndex].esercizi;
    const start = this.currentExercisePage * this.pageSize;
    return esercizi.slice(start, start + this.pageSize);
  }
  get totalExercisePages() {
    const esercizi = this.scheda.giorni[this.giornoAttivoIndex].esercizi;
    return Math.max(1, Math.ceil(esercizi.length / this.pageSize));
  }
  goToPrevExercisePage() { if (this.currentExercisePage > 0) this.currentExercisePage--; }
  goToNextExercisePage() { if (this.currentExercisePage < this.totalExercisePages - 1) this.currentExercisePage++; }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
    await this.loadSelectedUser();
    await this.loadExercises();
    await this.loadCategories();
    await this.loadExistingSchedule();
    this.filtraEsercizi();
    this.filterUsers();
    if (!this.scheda.dataInizio) this.scheda.dataInizio = this.oggi;
    if (!this.scheda.orario) this.scheda.orario = this.normalizeTimeToHMS(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    this.generateLink();
  }

  async loadUsers() {
    const usersCol = collection(this.firestore, 'users');
    const snap = await getDocs(usersCol);
    this.allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
  }

  async loadSelectedUser() {
    this.cliente = this.allUsers[0] || null;
    if (this.cliente) this.scheda.userId = this.cliente.id;
  }

  async loadExercises() {
    const exCol = collection(this.firestore, 'exercises');
    const snap = await getDocs(exCol);
    this.esercizi = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  }

  async loadCategories() {
    const catCol = collection(this.firestore, 'categories');
    const snap = await getDocs(catCol);
    this.categorie = snap.docs.map(d => ({ id: d.id, selected: false, ...d.data() } as any));
  }

  async loadExistingSchedule() {
    if (!this.cliente) return;
    const schedeCol = collection(this.firestore, 'schede');
    const schedaRef = query(
      schedeCol,
      where('userId', '==', this.cliente.id),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(schedaRef);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scheda));
    if (list.length > 0) {
      this.scheda = list[list.length - 1];
      if (!this.scheda.giorni || this.scheda.giorni.length === 0) {
        this.scheda.giorni = [{ nome: 'Giorno 1', esercizi: [] }];
      }
    }
  }

  filterUsers() {
    const term = this.userSearch.toLowerCase().trim();
    this.filteredUserList = this.allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)
    );
  }
  openUserPicker() { this.showUserPicker = true; this.userSearch = ''; this.filterUsers(); }
  closeUserPicker() { this.showUserPicker = false; }
  async selectUser(u: User) {
    this.cliente = u;
    this.scheda.userId = u.id;
    this.closeUserPicker();
    await this.loadExistingSchedule();
    this.generateLink();
    this.currentExercisePage = 0;
  }

  enableTabEdit(g: Giorno) { g.editing = true; setTimeout(() => {
    const inputs = document.querySelectorAll('.tab-edit');
    const last = inputs[inputs.length - 1] as HTMLInputElement;
    last?.focus(); last?.select();
  }, 0); }
  disableTabEdit(g: Giorno) { g.editing = false; this.persistSchedule(); }
  setGiorno(i: number) { this.giornoAttivoIndex = i; this.currentExercisePage = 0; }
  aggiungiGiorno() {
    const n = this.scheda.giorni.length + 1;
    this.scheda.giorni.push({ nome: 'Giorno ' + n, esercizi: [] });
    this.giornoAttivoIndex = this.scheda.giorni.length - 1;
    this.currentExercisePage = 0;
    this.persistSchedule();
  }
  rimuoviGiorno() {
    if (this.scheda.giorni.length === 1) return;
    this.scheda.giorni.splice(this.giornoAttivoIndex, 1);
    if (this.giornoAttivoIndex >= this.scheda.giorni.length) {
      this.giornoAttivoIndex = this.scheda.giorni.length - 1;
    }
    this.currentExercisePage = 0;
    this.persistSchedule();
  }

  createScheduleExercise(e: { id: string; name: string; category: string; image?: string }): ScheduleExercise {
    return { id: e.id, nome: e.name, image: e.image, categoria: e.category, serie: 3, ripetizioni: 10, minuti: 0, secondi: 0, caricoKg: 0, note: '' };
  }
  aggiungiEsercizioAlGiorno(e: { id: string; name: string; category: string; image?: string }) {
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    g.esercizi.push(this.createScheduleExercise(e));
    this.persistSchedule();
  }
  rimuoviEsercizio(index: number) {
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    g.esercizi.splice(index + this.currentExercisePage * this.pageSize, 1);
    if (this.currentExercisePage > 0 && this.pagedExercises.length === 0) this.goToPrevExercisePage();
    this.persistSchedule();
  }
  filtraEsercizi() {
    const term = this.searchTerm.toLowerCase().trim();
    this.eserciziFiltrati = this.esercizi.filter(ex => {
      const nameMatch = (ex.name || '').toLowerCase().includes(term);
      const catMatch = this.filterCategoria ? ex.category === this.filterCategoria : true;
      return nameMatch && catMatch;
    });
  }

  async salvaScheda() {
    await this.authService.ensureSignedIn();
    const now = new Date();
    this.scheda.orario = this.normalizeTimeToHMS(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    this.scheda.dataInizio = now.toISOString().split('T')[0];

    await this.persistSchedule();

    const pdfBase64 = await this.buildPdfBase64();
    await this.appendCardToUser(this.scheda.dataInizio, this.scheda.orario!, pdfBase64);

    this.generateLink();
    this.showSavedMsg = true;
    this.savedMsgText = 'Scheda salvata';
    setTimeout(() => { this.showSavedMsg = false; }, 2500);
  }

  private normalizeTimeToHMS(time?: string): string {
    if (!time) return '';
    const m = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return time;
    const ss = m[3] ?? '00';
    return `${m[1]}:${m[2]}:${ss}`;
  }

  private async buildPdfBase64(): Promise<string> {
    try {
      const docPdf: any = await this.pdfSchedaService.buildDoc(this.scheda, this.cliente, this.logoPreviewUrl);
      const dataUri: string = docPdf.output('datauristring');
      const base64 = dataUri.split(',')[1] || '';
      return base64;
    } catch {
      return '';
    }
  }

  private async appendCardToUser(dataInizio: string, orario: string, pdfBase64: string) {
    if (!this.cliente || !this.scheda) return;
    await this.authService.ensureSignedIn();
    const titolo = this.computeScheduleTitle();
    const data = this.formatDateIT(dataInizio);
    const time = this.normalizeTimeToHMS(orario);

    const MAX_BASE64 = 850_000; // ~0.85MB per restare sotto 1MB limite Firestore doc
    const nuovaCard: WorkoutCard & { pdfBase64?: string } = {
      title: titolo,
      date: data || '',
      time
    };
    if (pdfBase64 && pdfBase64.length <= MAX_BASE64) {
      nuovaCard.pdfBase64 = pdfBase64;
    }

    const userRef = doc(this.firestore, `users/${this.cliente.id}`);
    try {
      const snap = await getDoc(userRef);
      const existing = (snap.exists() && Array.isArray((snap.data() as any).cards))
        ? (snap.data() as any).cards as WorkoutCard[]
        : [];
      // aggiunge in fondo alla lista senza sovrascrivere quelle esistenti
      const updated = [...existing, nuovaCard];
      await updateDoc(userRef, { cards: updated });
      if (this.cliente) this.cliente.cards = updated;
    } catch (err) {
      console.error('Error appending card to user', err);
    }
  }

  private computeScheduleTitle(): string {
    const giorno = this.scheda.giorni?.[this.giornoAttivoIndex]?.nome || 'Scheda allenamento';
    const livello = this.scheda.livello || '';
    const stato = this.scheda.stato || '';
    const base = livello ? `${giorno} • ${livello}` : giorno;
    return stato ? `${base} • ${stato}` : base;
  }
  private formatDateIT(iso?: string): string | null {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  async persistSchedule() {
    if (!this.cliente) return;
    await this.authService.ensureSignedIn();
    const data: Scheda = {
      ...this.scheda,
      userId: this.cliente.id,
      createdAt: Date.now()
    };
    if (this.scheda.id) {
      const schedaDoc = doc(this.firestore, `schede/${this.scheda.id}`);
      try {
        await setDoc(schedaDoc, data, { merge: true });
      } catch (err) {
        console.error('Error updating schedule', err);
      }
    } else {
      const schedeCol = collection(this.firestore, 'schede');
      try {
        const ref = await addDoc(schedeCol, data);
        this.scheda.id = ref.id;
      } catch (err) {
        console.error('Error creating schedule', err);
      }
    }
  }

  apriSchedaPerUser(userId: string) {
    this.router.navigate(['/gestione-schede'], { state: { selectedUserId: userId } });
  }

  async anteprimaPdf() {
    const docPdf: any = await this.pdfSchedaService.buildDoc(this.scheda, this.cliente, this.logoPreviewUrl);
    const blob = docPdf.output('blob');
    if (this.pdfBlobUrl) try { URL.revokeObjectURL(this.pdfBlobUrl); } catch {}
    this.pdfBlobUrl = URL.createObjectURL(blob);
    window.open(this.pdfBlobUrl, '_blank');
  }

  openShareModal() { this.generateLink(); this.shareModalOpen = true; }
  closeShareModal() { this.shareModalOpen = false; }
  generateLink() {
    if (!this.cliente) { this.generatedLink = ''; return; }
    const base = location.origin;
    const summary = encodeURIComponent(JSON.stringify({
      cliente: this.cliente.name,
      stato: this.scheda.stato,
      livello: this.scheda.livello,
      durata: this.scheda.durata,
      inizio: this.scheda.dataInizio,
      giorni: this.scheda.giorni.map(g => ({
        nome: g.nome,
        esercizi: g.esercizi.map(e => ({
          nome: e.nome,
          serie: e.serie,
          ripetizioni: e.ripetizioni,
          min: e.minuti,
          sec: e.secondi,
          note: e.note
        }))
      }))
    }));
    this.generatedLink = `${base}/scheda-share?data=${summary}`;
  }

  copyShareLink() {
    if (!this.generatedLink) return;
    navigator.clipboard.writeText(this.generatedLink).catch(() => {});
  }

  moveExerciseUp(index: number) {
    const elenco = this.scheda.giorni[this.giornoAttivoIndex].esercizi;
    const realIdx = index + this.currentExercisePage * this.pageSize;
    if (realIdx === 0) return;
    [elenco[realIdx - 1], elenco[realIdx]] = [elenco[realIdx], elenco[realIdx - 1]];
    this.persistSchedule();
  }

  moveExerciseDown(index: number) {
    const elenco = this.scheda.giorni[this.giornoAttivoIndex].esercizi;
    const realIdx = index + this.currentExercisePage * this.pageSize;
    if (realIdx === elenco.length - 1) return;
    [elenco[realIdx + 1], elenco[realIdx]] = [elenco[realIdx], elenco[realIdx + 1]];
    this.persistSchedule();
  }

  resetExercise(index: number) {
    const elenco = this.scheda.giorni[this.giornoAttivoIndex].esercizi;
    const realIdx = index + this.currentExercisePage * this.pageSize;
    elenco[realIdx].serie = 3;
    elenco[realIdx].ripetizioni = 10;
    elenco[realIdx].minuti = 0;
    elenco[realIdx].secondi = 0;
    elenco[realIdx].note = '';
    this.persistSchedule();
  }

  onLogoSelect(event: any): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    this.tempLogoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}