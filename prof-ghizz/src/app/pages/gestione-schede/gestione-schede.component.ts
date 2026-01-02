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

interface ScheduleExerciseWeekValues {
  serie: number;
  ripetizioni: number;
  minuti: number;
  secondi: number;
  caricoKg: number;
  note: string;
}

interface ScheduleExercise {
  id: string;
  nome: string;
  image?: string;
  categoria?: string;
  settimaneValori: ScheduleExerciseWeekValues[];
}

interface Settimana { nome: string; }
interface Giorno {
  nome: string;
  esercizi: ScheduleExercise[];
  editing?: boolean;
  settimane?: Settimana[];
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
  templateType?: string;
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
    giorni: [{
      nome: 'Giorno 1',
      esercizi: [],
      settimane: [{ nome: 'Settimana 1' }]
    }],
    templateType: 'fitnessanddance'
  };

  logoPreviewUrl: string | null = null;
  tempLogoFile: File | null = null;

  giornoAttivoIndex = 0;
  settimanaAttivaIndex = 0;

  esercizi: Array<{ id: string; name: string; category: string; image?: string }> = [];
  categorie: Array<{ id: string; name: string; image?: string; selected?: boolean }> = [];
  eserciziFiltrati: Array<{ id: string; name: string; category: string; image?: string }> = [];
  searchTerm = '';
  filterCategoria = '';
  allUsers: User[] = [];
  filteredUserList: User[] = [];
  userSearch = '';
  showUserPicker = false;

  oggi = new Date().toISOString().split('T')[0];
  pdfBlobUrl: string | null = null;

  currentExercisePage = 0;
  pageSize = 3;

  showSavedMsg = false;
  savedMsgText = 'Scheda salvata';

  templateType = 'fitnessanddance';

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

  ngOnInit(): void { this.initStandard(); }

  async initStandard() {
    await this.loadUsers();
    await this.loadSelectedUser();
    await this.loadExercises();
    await this.loadCategories();
    await this.loadExistingSchedule();
    this.filtraEsercizi();
    this.filterUsers();
    if (!this.scheda.dataInizio) this.scheda.dataInizio = this.oggi;
    if (!this.scheda.orario) this.scheda.orario = this.normalizeTimeToHMS(
      new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    this.scheda.templateType = this.templateType;

    this.scheda.giorni.forEach(g => {
      if (this.templateType === 'profghizztemplate') {
        if (!g.settimane || g.settimane.length === 0) g.settimane = [{ nome: 'Settimana 1' }];
      } else {
        delete g.settimane;
      }
      g.esercizi.forEach(ex => {
        if (!ex.settimaneValori || ex.settimaneValori.length === 0) {
          ex.settimaneValori = [this.zeroValues()];
        }
      });
    });

    if (this.templateType === 'profghizztemplate') {
      this.giornoAttivoIndex = 0;
      this.settimanaAttivaIndex = 0;
    }
  }

  onTemplateTypeChange(type: string) {
    this.templateType = type;
    this.scheda.templateType = type;
    if (type === 'profghizztemplate') {
      this.scheda.giorni = [{
        nome: 'Giorno 1',
        esercizi: [],
        settimane: [{ nome: 'Settimana 1' }]
      }];
      this.giornoAttivoIndex = 0;
      this.settimanaAttivaIndex = 0;
    } else {
      this.scheda.giorni = [{
        nome: 'Giorno 1',
        esercizi: []
      }];
      this.giornoAttivoIndex = 0;
      this.settimanaAttivaIndex = 0;
    }
    this.persistSchedule();
  }

  setGiorno(i: number) {
    this.giornoAttivoIndex = i;
    this.settimanaAttivaIndex = 0;
    this.currentExercisePage = 0;
  }

  setSettimana(i: number) {
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    if (this.templateType === 'profghizztemplate' && g.settimane) {
      g.esercizi.forEach(ex => {
        ex.settimaneValori = ex.settimaneValori || [];
        while (ex.settimaneValori.length <= i) {
          ex.settimaneValori.push(this.zeroValues());
        }
      });
    }
    this.settimanaAttivaIndex = i;
  }

  aggiungiGiorno() {
    const n = this.scheda.giorni.length + 1;
    if (this.templateType === 'profghizztemplate') {
      this.scheda.giorni.push({ nome: 'Giorno ' + n, esercizi: [], settimane: [{ nome: 'Settimana 1' }] });
    } else {
      this.scheda.giorni.push({ nome: 'Giorno ' + n, esercizi: [] });
    }
    this.giornoAttivoIndex = this.scheda.giorni.length - 1;
    this.settimanaAttivaIndex = 0;
    this.currentExercisePage = 0;
    this.persistSchedule();
  }

  rimuoviGiorno() {
    if (this.scheda.giorni.length === 1) return;
    this.scheda.giorni.splice(this.giornoAttivoIndex, 1);
    if (this.giornoAttivoIndex >= this.scheda.giorni.length) this.giornoAttivoIndex = this.scheda.giorni.length - 1;
    this.settimanaAttivaIndex = 0;
    this.currentExercisePage = 0;
    this.persistSchedule();
  }

  aggiungiSettimanaGiorno() {
    if (this.templateType !== 'profghizztemplate') return;
    let settimane = this.scheda.giorni[this.giornoAttivoIndex].settimane || [];
    settimane.push({ nome: 'Settimana ' + (settimane.length + 1) });
    this.scheda.giorni[this.giornoAttivoIndex].settimane = settimane;
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    g.esercizi.forEach(ex => {
      ex.settimaneValori = ex.settimaneValori || [];
      ex.settimaneValori.push(this.zeroValues());
    });
    this.settimanaAttivaIndex = settimane.length - 1;
    this.persistSchedule();
  }

  rimuoviSettimanaGiorno() {
    if (this.templateType !== 'profghizztemplate') return;
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    let settimane = g.settimane || [];
    if (settimane.length === 1) return;
    settimane.splice(this.settimanaAttivaIndex, 1);
    g.esercizi.forEach(ex => {
      if (ex.settimaneValori?.length > this.settimanaAttivaIndex) {
        ex.settimaneValori.splice(this.settimanaAttivaIndex, 1);
      }
    });
    if (this.settimanaAttivaIndex >= settimane.length) this.settimanaAttivaIndex = settimane.length - 1;
    g.settimane = settimane;
    this.persistSchedule();
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
    const schedaRef = query(schedeCol, where('userId', '==', this.cliente.id), orderBy('createdAt', 'asc'));
    const snap = await getDocs(schedaRef);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scheda));
    if (list.length > 0) {
      this.scheda = list[list.length - 1];
      this.scheda.giorni.forEach(g => {
        if (this.templateType === 'profghizztemplate') {
          if (!g.settimane || g.settimane.length === 0) g.settimane = [{ nome: 'Settimana 1' }];
        } else {
          delete g.settimane;
        }
        g.esercizi.forEach(ex => {
          if (!ex.settimaneValori || ex.settimaneValori.length === 0) {
            ex.settimaneValori = [this.zeroValues()];
          }
        });
      });
      this.scheda.templateType = this.scheda.templateType || 'fitnessanddance';
      this.templateType = this.scheda.templateType;
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
    this.currentExercisePage = 0;
  }

  enableTabEdit(g: Giorno) { g.editing = true; setTimeout(() => {
    const inputs = document.querySelectorAll('.tab-edit');
    const last = inputs[inputs.length - 1] as HTMLInputElement;
    last?.focus(); last?.select();
  }, 0); }
  disableTabEdit(g: Giorno) { g.editing = false; this.persistSchedule(); }

  aggiungiEsercizioAlGiorno(e: { id: string; name: string; category: string; image?: string }) {
    const g = this.scheda.giorni[this.giornoAttivoIndex];
    if (this.templateType === 'profghizztemplate') {
      const weeks = g.settimane?.length || 1;
      g.esercizi.push({
        id: e.id,
        nome: e.name,
        image: e.image,
        categoria: e.category,
        settimaneValori: Array.from({ length: weeks }, () => this.zeroValues())
      });
    } else {
      g.esercizi.push({
        id: e.id,
        nome: e.name,
        image: e.image,
        categoria: e.category,
        settimaneValori: [this.zeroValues()]
      });
    }
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
    this.scheda.templateType = this.templateType;
    await this.persistSchedule();

    const pdfBase64 = await this.buildPdfBase64();
    await this.appendCardToUser(this.scheda.dataInizio, this.scheda.orario!, pdfBase64);

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

  private zeroValues(): ScheduleExerciseWeekValues {
    return { serie: 0, ripetizioni: 0, minuti: 0, secondi: 0, caricoKg: 0, note: '' };
  }

  private async buildPdfBase64(): Promise<string> {
    try {
      const docPdf: any = this.scheda.templateType === 'profghizztemplate'
        ? await this.pdfSchedaService.buildProfGhizzDoc(this.scheda, this.cliente, this.logoPreviewUrl)
        : await this.pdfSchedaService.buildDoc(this.scheda, this.cliente, this.logoPreviewUrl);
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

    const MAX_BASE64 = 850_000;
    const nuovaCard: WorkoutCard & { pdfBase64?: string } = { title: titolo, date: data || '', time };
    if (pdfBase64 && pdfBase64.length <= MAX_BASE64) nuovaCard.pdfBase64 = pdfBase64;

    const userRef = doc(this.firestore, `users/${this.cliente.id}`);
    try {
      const snap = await getDoc(userRef);
      const existing = (snap.exists() && Array.isArray((snap.data() as any).cards))
        ? (snap.data() as any).cards as WorkoutCard[]
        : [];
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
      createdAt: Date.now(),
      templateType: this.templateType
    };
    if (this.scheda.id) {
      const schedaDoc = doc(this.firestore, `schede/${this.scheda.id}`);
      try { await setDoc(schedaDoc, data, { merge: true }); }
      catch (err) { console.error('Error updating schedule', err); }
    } else {
      const schedeCol = collection(this.firestore, 'schede');
      try { const ref = await addDoc(schedeCol, data); this.scheda.id = ref.id; }
      catch (err) { console.error('Error creating schedule', err); }
    }
  }

  apriSchedaPerUser(userId: string) {
    this.router.navigate(['/gestione-schede'], { state: { selectedUserId: userId } });
  }

  async anteprimaPdf() {
    let docPdf: any;
    if (this.scheda.templateType === 'profghizztemplate') {
      docPdf = await this.pdfSchedaService.buildProfGhizzDoc(this.scheda, this.cliente, this.logoPreviewUrl);
    } else {
      docPdf = await this.pdfSchedaService.buildDoc(this.scheda, this.cliente, this.logoPreviewUrl);
    }
    const blob = docPdf.output('blob');
    if (this.pdfBlobUrl) try { URL.revokeObjectURL(this.pdfBlobUrl); } catch {}
    this.pdfBlobUrl = URL.createObjectURL(blob);
    window.open(this.pdfBlobUrl, '_blank');
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
    if (!elenco[realIdx]?.settimaneValori) return;
    const w = this.templateType === 'profghizztemplate' ? this.settimanaAttivaIndex : 0;
    elenco[realIdx].settimaneValori[w] = this.zeroValues();
    this.persistSchedule();
  }

  onLogoSelect(event: any): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    this.tempLogoFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.logoPreviewUrl = reader.result as string; };
    reader.readAsDataURL(file);
  }
}