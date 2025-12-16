import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { ImageService } from '../../services/image.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-anagrafica',
  templateUrl: './anagrafica.component.html',
  styleUrls: ['./anagrafica.component.css'],
  standalone: false
})
export class AnagraficaComponent implements OnInit, OnDestroy {
  // UI filtri (questa è l’unica pagina con i filtri)
  searchTerm: string = '';
  showFilters: boolean = false;
  filterStatus: string = '';
  filterHasEmail: string = '';
  filterTessera: string = ''; // '', 'attiva', 'scaduta'

  // Dati
  users: User[] = [];
  filteredUsers: User[] = [];

  // Modale "Registra Cliente" (semplificata)
  modalOpen: boolean = false;
  today: string = new Date().toISOString().slice(0, 10);

  form = {
    avatar: '',
    avatarFile: null as File | null,
    nome: '',
    cognome: '',
    emailModal: '',
    phone: '',
    signupDateModal: '',
    isActive: true,
  };

  avatarLoading: boolean = false;
  private usersSub?: Subscription;

  constructor(
    private userService: UserService,
    private imageService: ImageService
  ) {}

  ngOnInit() {
    this.usersSub = this.userService.getAll$().subscribe(data => {
      this.users = (data || []);
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    this.usersSub?.unsubscribe();
  }

  // Apertura/chiusura modale
  openModal() {
    this.modalOpen = true;
    this.form = {
      avatar: '',
      avatarFile: null,
      nome: '',
      cognome: '',
      emailModal: '',
      phone: '',
      signupDateModal: '',
      isActive: true,
    };
  }
  closeModal() {
    this.modalOpen = false;
  }

  // Eventi UI
  onSearchChange() { this.applyFilters(); }
  toggleFilters() { this.showFilters = !this.showFilters; }

  // =============== Filtri ===============
  private matchesSearch(u: User, term: string): boolean {
    if (!term) return true;
    const t = term.toLowerCase();
    return (u.name?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t) || false);
  }

  private hasEmail(u: User): boolean {
    return !!(u.email && u.email.trim() !== '');
  }

  // Uniforma la "data fine tessera" alla logica usata in Home:
  // - priorità a subscriptionEnd
  // - fallback a tesseraEnd
  // - ritorna '' se mancante o non valida
  private getTesseraFine(u: User): string {
    const end = (u.subscriptionEnd || u.tesseraEnd || '').trim();
    return end.length === 10 ? end : '';
  }

  applyFilters() {
    let temp = [...this.users];

    // search
    if (this.searchTerm) {
      temp = temp.filter(u => this.matchesSearch(u, this.searchTerm));
    }

    // stato
    if (this.filterStatus) {
      temp = temp.filter(u => u.status === this.filterStatus);
    }

    // email
    if (this.filterHasEmail === 'with') {
      temp = temp.filter(u => this.hasEmail(u));
    } else if (this.filterHasEmail === 'without') {
      temp = temp.filter(u => !this.hasEmail(u));
    }

    // Tessera: stessa logica della Home (confronto stringhe yyyy-mm-dd)
    if (this.filterTessera === 'attiva') {
      temp = temp.filter(u => {
        const end = this.getTesseraFine(u);
        return end !== '' && end > this.today;
      });
    } else if (this.filterTessera === 'scaduta') {
      temp = temp.filter(u => {
        const end = this.getTesseraFine(u);
        return end !== '' && end <= this.today;
      });
    }

    this.filteredUsers = temp;
  }
  // =============== /Filtri ===============

  // Avatar modale
  async onAvatarChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.avatarLoading = true;
    this.form.avatarFile = file;
    this.form.avatar = await this.imageService.compressAndConvertToBase64(file, 1000, 256);
    this.avatarLoading = false;
  }
  triggerAvatarInput(input: HTMLInputElement) { input.click(); }

  // Salva nuovo utente (modale semplificata)
  async registerUser() {
    this.avatarLoading = true;
    const status: 'Attivo' | 'Inattivo' = this.form.isActive ? 'Attivo' : 'Inattivo';

    const newUser: Omit<User, 'id'> = {
      name: `${this.form.nome} ${this.form.cognome}`.trim(),
      email: this.form.emailModal,
      phone: this.form.phone,
      signupDate: this.form.signupDateModal || new Date().toISOString().slice(0, 10),
      avatarUrl: this.form.avatar,
      status,
      // Niente campi extra qui (tesseraEnd/subscriptionEnd li gestirai altrove)
      cards: []
    };

    try {
      await this.userService.add(newUser);
      this.avatarLoading = false;
      this.closeModal();
      this.applyFilters();
    } catch (e: any) {
      this.avatarLoading = false;
      alert('Errore nel salvataggio: ' + (e?.message || e));
    }
  }
}