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
  searchTerm: string = '';
  showFilters: boolean = false;
  filterStatus: string = '';
  filterHasEmail: string = '';
  filterTessera: string = ''; // <--- aggiunto
  users: User[] = [];
  filteredUsers: User[] = [];
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
    birthDate: '',
    gender: '',
    address: '',
    city: '',
    cap: '',
    personalNotes: '',
    tesseraEnd: '', // <--- aggiunto per filtrare la tessera
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
      birthDate: '',
      gender: '',
      address: '',
      city: '',
      cap: '',
      personalNotes: '',
      tesseraEnd: '',
    };
  }

  closeModal() {
    this.modalOpen = false;
  }

  onSearchChange() {
    this.applyFilters();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    let tempUsers = [...this.users];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      tempUsers = tempUsers.filter(user =>
        (user.name?.toLowerCase().includes(term)) ||
        (user.email?.toLowerCase().includes(term))
      );
    }
    if (this.filterStatus) {
      tempUsers = tempUsers.filter(user => user.status === this.filterStatus);
    }
    if (this.filterHasEmail === 'with') {
      tempUsers = tempUsers.filter(user => user.email && user.email !== '');
    } else if (this.filterHasEmail === 'without') {
      tempUsers = tempUsers.filter(user => !user.email || user.email === '');
    }

    // Filtro tessera
    if (this.filterTessera === 'attiva') {
      tempUsers = tempUsers.filter(user => user.tesseraEnd && user.tesseraEnd > this.today);
    } else if (this.filterTessera === 'scaduta') {
      tempUsers = tempUsers.filter(user => user.tesseraEnd && user.tesseraEnd <= this.today);
    }

    this.filteredUsers = tempUsers;
  }

  async onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.avatarLoading = true;
      this.form.avatarFile = file;
      this.form.avatar = await this.imageService.compressAndConvertToBase64(file, 1000, 256);
      this.avatarLoading = false;
    }
  }

  triggerAvatarInput(avatarInput: HTMLInputElement) {
    avatarInput.click();
  }

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
      birthDate: this.form.birthDate,
      gender: this.form.gender,
      address: this.form.address,
      city: this.form.city,
      cap: this.form.cap,
      personalNotes: this.form.personalNotes,
      tesseraEnd: this.form.tesseraEnd, // <--- aggiunto per salvataggio tessera
      cards: []
    };

    this.userService.add(newUser)
      .then(() => {
        this.avatarLoading = false;
        this.closeModal();
      })
      .catch(error => {
        this.avatarLoading = false;
        alert('Errore nel salvataggio: ' + error.message);
      });
  }
}