import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-anagrafica-list',
  templateUrl: './anagrafica-list.component.html',
  styleUrls: ['./anagrafica-list.component.css'],
  standalone: false
})
export class AnagraficaListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  filterExpiredOnly: boolean = false;
  filterTessera: string = ''; // '', 'attiva', 'scaduta'
  filterScheda: string = '';
  today: string = new Date().toISOString().substring(0, 10);

  modalOpen: boolean = false;
  form = {
    nome: '',
    cognome: '',
    email: '',
    phone: '',
    signupDate: '',
    status: '',
    address: '',
    city: '',
    provincia: '',
    cap: '',
    birthDate: '',
    gender: '',
    subscriptionEnd: '',
    schedaEnd: '', // per filtro scheda
    personalNotes: ''
  };

  constructor(private userService: UserService) {}

  async ngOnInit() {
    const allUsers = await this.userService.getAll();
    this.users = allUsers.sort((a, b) => {
      const aExpired = a.subscriptionEnd && a.subscriptionEnd <= this.today;
      const bExpired = b.subscriptionEnd && b.subscriptionEnd <= this.today;
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      return 0;
    });
    this.applyFilters();
  }

  applyFilters() {
    let tempUsers = [...this.users];

    if (this.filterExpiredOnly)
      tempUsers = tempUsers.filter(u => u.subscriptionEnd && u.subscriptionEnd <= this.today);

    // Filtro tessera ("attiva"/"scaduta"/"")
    if (this.filterTessera === 'attiva') {
      tempUsers = tempUsers.filter(u => u.schedaEnd && u.schedaEnd > this.today);
    } else if (this.filterTessera === 'scaduta') {
      tempUsers = tempUsers.filter(u => u.schedaEnd && u.schedaEnd <= this.today);
    }
    // Filtro scheda (radio)
    if (this.filterScheda === 'scaduta') {
      tempUsers = tempUsers.filter(u => u.schedaEnd && u.schedaEnd <= this.today);
    } else if (this.filterScheda === 'attiva') {
      tempUsers = tempUsers.filter(u => u.schedaEnd && u.schedaEnd > this.today);
    }
    this.filteredUsers = tempUsers;
  }

  openModal() { this.modalOpen = true; }
  closeModal() { this.modalOpen = false; }

  openWhatsApp(phone: string, name: string, end: string) {
    const message = `Ciao ${name}, il tuo abbonamento scade il ${end}!`;
    const waUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }

  async registerUser() {
    const newUser: Omit<User, 'id'> = {
      name: `${this.form.nome} ${this.form.cognome}`.trim(),
      email: this.form.email,
      phone: this.form.phone,
      signupDate: this.form.signupDate || new Date().toISOString().slice(0, 10),
      status: this.form.status,
      address: this.form.address,
      city: this.form.city,
      provincia: this.form.provincia,
      cap: this.form.cap,
      birthDate: this.form.birthDate,
      gender: this.form.gender,
      subscriptionEnd: this.form.subscriptionEnd,
      schedaEnd: this.form.schedaEnd, // important
      personalNotes: this.form.personalNotes,
    };
    await this.userService.add(newUser);
    this.modalOpen = false;
    this.users.unshift(newUser as User);
    this.applyFilters();
  }
}