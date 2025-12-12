import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PdfSchedaService } from '../../services/pdf-scheda-service';
import { AuthService } from '../../services/auth.service';

// Usa le API MODULARI di AngularFire
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

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
  logoPreviewUrl?: string | null;
  createdAt?: number;
}
interface StoredExercise { id: string; name: string; category: string; image?: string; }
interface StoredCategory { id: string; name: string; image?: string; selected?: boolean; }
interface User {
  id: string;
  name: string;
  email: string;
  signupDate: string;
  status: string;
  phone?: string;
  avatarUrl?: string;
  cards?: Array<{ title: string; date: string; time?: string }>;
}

@Component({
  selector: 'app-gestione-schede',
  templateUrl: './gestione-schede.component.html',
  styleUrls: ['./gestione-schede.component.css'],
  standalone: false
})
export class GestioneSchedeComponent implements OnInit {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

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
    giorni: [{ nome: 'Giorno 1', esercizi: [] }],
    logoPreviewUrl: null
  };
  logoPreviewUrl: string | null = null;
  giornoAttivoIndex = 0;
  esercizi: StoredExercise[] = [];
  categorie: StoredCategory[] = [];
  eserciziFiltrati: StoredExercise[] = [];
  searchTerm = '';
  filterCategoria = '';
  allUsers: User[] = [];
  filteredUserList: User[] = [];
  userSearch = '';
  showUserPicker = false;
  shareModalOpen = false;
  generatedLink = '';
  oggi = new Date().toISOString().split('T')[0];
  private _pdfBlob: Blob | null = null;
  private _pdfFileName: string = '';
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
    this.logoPreviewUrl = this.scheda.logoPreviewUrl || null;
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
    this.esercizi = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoredExercise));
  }

  async loadCategories() {
    const catCol = collection(this.firestore, 'categories');
    const snap = await getDocs(catCol);
    this.categorie = snap.docs.map(d => ({ id: d.id, selected: false, ...d.data() } as StoredCategory));
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
      this.logoPreviewUrl = this.scheda.logoPreviewUrl || null;
      if (!this.scheda.orario) this.scheda.orario = this.normalizeTimeToHMS(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }

  filterUsers() {
    const term = this.userSearch.toLowerCase().trim();
    this.filteredUserList = this.allUsers.filter(u =>
      u.name.toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)
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

  createScheduleExercise(e: StoredExercise): ScheduleExercise {
    return { id: e.id, nome: e.name, image: e.image, categoria: e.category, serie: 3, ripetizioni: 10, minuti: 0, secondi: 0, caricoKg: 0, note: '' };
  }
  aggiungiEsercizioAlGiorno(e: StoredExercise) {
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
      const nameMatch = ex.name.toLowerCase().includes(term);
      const catMatch = this.filterCategoria ? ex.category === this.filterCategoria : true;
      return nameMatch && catMatch;
    });
  }

  async salvaScheda() {
    await this.authService.ensureSignedIn();
    this.scheda.logoPreviewUrl = this.logoPreviewUrl;
    const now = new Date();
    this.scheda.orario = this.normalizeTimeToHMS(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    this.scheda.dataInizio = now.toISOString().split('T')[0];
    await this.persistSchedule();
    this.generateLink();
    await this.appendCardToUser(this.scheda.dataInizio, this.scheda.orario);
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

  private async appendCardToUser(dataInizio: string, orario: string) {
    if (!this.cliente || !this.scheda) return;
    await this.authService.ensureSignedIn();
    const titolo = this.computeScheduleTitle();
    const data = this.formatDateIT(dataInizio);
    const time = this.normalizeTimeToHMS(orario);
    const nuovaCard = { title: titolo, date: data!, time: time };
    const userDoc = doc(this.firestore, `users/${this.cliente.id}`);
    try {
      // Ottieni dati esistenti dell'utente (con campi extra)
      const snap = await getDocs(query(collection(this.firestore, 'users'), where('id', '==', this.cliente.id)));
      const user = snap.docs[0]?.data() as User;
      const existingCards = Array.isArray(user?.cards) ? user.cards : [];
      await updateDoc(userDoc, { cards: [nuovaCard, ...existingCards] });
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

  // Persisti la scheda su Firestore (storico)
  async persistSchedule() {
    if (!this.cliente) return;
    await this.authService.ensureSignedIn();
    this.scheda.logoPreviewUrl = this.logoPreviewUrl;
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

  async stampa() {
    await this.pdfSchedaService.buildAndSavePdf(this.scheda, this.cliente, this.logoPreviewUrl);
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

  shareEmail(provider: 'gmail' | 'outlook') {
    if (!this.cliente) return;
    const subject = 'Scheda Allenamento';
    const bodyLines = [
      `Ciao ${this.cliente.name}`,
      `Livello: ${this.scheda.livello}`,
      `Durata: ${this.scheda.durata}`,
      `Inizio: ${this.scheda.dataInizio}`,
      '',
      ...this.scheda.giorni.map(g =>
        g.nome + ': ' + g.esercizi.map(e => `${e.nome} ${e.serie}x${e.ripetizioni}`).join(', ')
      ),
      '',
      `Link scheda: ${this.generatedLink}`
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const subj = encodeURIComponent(subject);
    let url = '';
    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(this.cliente.email)}&su=${subj}&body=${body}`;
    } else {
      url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(this.cliente.email)}&subject=${subj}&body=${body}`;
    }
    window.open(url, '_blank');
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

  async onLogoSelect(event: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const filePath = `logos/${this.scheda.userId || 'generic'}/${Date.now()}_logo`;
      const storageRef = ref(this.storage, filePath);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        this.logoPreviewUrl = url || null;
        this.scheda.logoPreviewUrl = this.logoPreviewUrl;
        await this.persistSchedule();
      } catch (err) {
        console.error('Error uploading logo or persisting schedule', err);
      }
    }
  }

  private async getScaledImageData(src?: string, w = 40, h = 30): Promise<string | undefined> {
    if (!src) return;
    return await new Promise<string | undefined>(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w * 2;
        c.height = h * 2;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        const r = img.width / img.height;
        const cr = c.width / c.height;
        let dw: number; let dh: number;
        if (r > cr) {
            dh = c.height;
            dw = dh * r;
        } else {
            dw = c.width;
            dh = dw / r;
        }
        ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
        resolve(c.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(undefined);
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  private wrapText(doc: any, text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (doc.getTextWidth(test) > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private safeString(v?: string): string {
    return (v || '').trim().replace(/\s+/g, '');
  }

  private async getScaledImageDataForPdfHQ(src?: string, w = 40, h = 30): Promise<string | undefined> {
    if (!src) return;
    return await new Promise<string | undefined>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = 4;
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        const ctx = c.getContext('2d', { alpha: false });
        if (!ctx) return resolve(undefined);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        const cRatio = c.width / c.height;
        const iRatio = img.width / img.height;
        let sx=0, sy=0, sWidth=img.width, sHeight=img.height;
        if (iRatio > cRatio) {
          sWidth = img.height * cRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / cRatio;
          sy = (img.height - sHeight) / 2;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png', 1));
      };
      img.onerror = () => resolve(undefined);
      img.src = src;
    });
  }
}