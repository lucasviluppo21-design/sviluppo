import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, addDoc, doc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-calendar-planning',
  templateUrl: './calendar-planning.component.html',
  styleUrls: ['./calendar-planning.component.css']
})
export class CalendarPlanningComponent implements OnInit {
  showDeleteModal = false;
  deleteId: string | null = null;
  START_HOUR = 7;
  hours = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
  currentDate = new Date();
  selectedMonth = this.currentDate.getMonth();
  selectedYear = this.currentDate.getFullYear();
  giorniSettimana: any[] = [];
  activities$: Observable<any[]>;
  filteredActivities$: Observable<any[]>;
  allUsers$: Observable<any[]>;
  filteredUsers$: Observable<any[]>;
  private searchSubject = new BehaviorSubject<string>('');
  private clienteSubject = new BehaviorSubject<any>(null);
  currentDayEvents: any[] = [];
  cliente: any = null;
  userSearch = '';
  showUserPicker = false;
  showActivityPicker = false;
  selectedAppointment: any = null;
  newAppointment = { titolo: '', oraInizio: '09:00', oraFine: '10:00', dataIso: '', note: '' };

  /** Mostra dati solo nella prima cella della fascia oraria */
  isFirstSlotOfActivity(dataIso: string, hour: string, ev: any): boolean {
    if (!ev) return false;
    return ev.oraInizio === hour && ev.dataIso === dataIso;
  }
  /** Restituisce l'attività per slot */
  getSlotActivity(dataIso: string, hour: string, activities: any[]): any {
    if (!activities) return null;
    const slotHour = parseInt(hour.split(':')[0]);
    return activities.find(ev => {
      if (ev.dataIso !== dataIso) return false;
      const startHour = parseInt(ev.oraInizio.split(':')[0]);
      const endHour = parseInt(ev.oraFine.split(':')[0]);
      return slotHour >= startHour && slotHour < endHour;
    }) || null;
  }
  /** Evidenzia slot attivi */
  isSlotActive(dataIso: string, hour: string, activities: any[]): boolean {
    if (!activities) return false;
    const slotHour = parseInt(hour.split(':')[0]);
    return activities.some(ev => {
      if (ev.dataIso !== dataIso) return false;
      const startHour = parseInt(ev.oraInizio.split(':')[0]);
      const endHour = parseInt(ev.oraFine.split(':')[0]);
      return slotHour >= startHour && slotHour < endHour;
    });
  }

  constructor(private firestore: Firestore) {
    const appRef = collection(this.firestore, 'appointments');
    this.activities$ = collectionData(appRef, { idField: 'id' });
    this.filteredActivities$ = this.activities$;
    const userRef = collection(this.firestore, 'users');
    this.allUsers$ = collectionData(userRef, { idField: 'id' });
    this.filteredUsers$ = combineLatest([this.allUsers$, this.searchSubject]).pipe(
      map(([users, term]) => users.filter(u => u.name.toLowerCase().includes(term.toLowerCase())))
    );
  }

  ngOnInit() { this.generateWeek(); }
  generateWeek() {
    const d = new Date(this.currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    this.giorniSettimana = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      this.giorniSettimana.push({
        nome: ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'][i],
        dataDisplay: date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        dataIso: date.toISOString().split('T')[0],
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
  }
  getMonthName() {
    return ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'][this.selectedMonth];
  }
  changeWeek(delta: number) {
    this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
    this.selectedMonth = this.currentDate.getMonth();
    this.selectedYear = this.currentDate.getFullYear();
    this.generateWeek();
  }
  goToToday() {
    this.currentDate = new Date();
    this.selectedMonth = this.currentDate.getMonth();
    this.selectedYear = this.currentDate.getFullYear();
    this.generateWeek();
  }
  onSearchChange() { this.searchSubject.next(this.userSearch); }
  selectUser(user: any) {
    this.cliente = user;
    this.clienteSubject.next(user);
    this.showUserPicker = false;
  }
  onStartChange() {
    if (!this.newAppointment.oraInizio) return;
    const h = parseInt(this.newAppointment.oraInizio.split(':')[0]) + 1;
    this.newAppointment.oraFine = `${h.toString().padStart(2, '0')}:00`;
  }
  openSlot(dateIso: string, hour: string) {
    this.selectedAppointment = null;
    this.newAppointment = { titolo: '', oraInizio: hour, oraFine: '', dataIso: dateIso, note: '' };
    const h = parseInt(hour.split(':')[0]) + 1;
    this.newAppointment.oraFine = `${h.toString().padStart(2, '0')}:00`;
    this.showActivityPicker = true;
  }
  openEvent(ev: any) {
    this.selectedAppointment = ev;
    this.newAppointment = {
      titolo: ev.titolo,
      oraInizio: ev.oraInizio,
      oraFine: ev.oraFine,
      dataIso: ev.dataIso,
      note: ev.note || ''
    };
    // Aggiorna il cliente selezionato con i dati dell'attività
    this.cliente = { id: ev.clienteId, name: ev.userName };
    this.showActivityPicker = true;
  }
  async salvaAppuntamento() {
    if (!this.cliente && !this.selectedAppointment) {
      alert('Seleziona un cliente!');
      return;
    }
    if (!this.newAppointment.titolo.trim()) {
      alert('Inserisci un titolo per l\'attività');
      return;
    }
    let payload: any = {
      ...this.newAppointment,
      updatedAt: new Date()
    };
    if (this.selectedAppointment) {
      payload.clienteId = this.selectedAppointment.clienteId;
      payload.userName = this.selectedAppointment.userName;
      const ref = doc(this.firestore, `appointments/${this.selectedAppointment.id}`);
      await updateDoc(ref, payload);
    } else {
      payload.clienteId = this.cliente.id;
      payload.userName = this.cliente.name;
      await addDoc(collection(this.firestore, 'appointments'), {
        ...payload,
        createdAt: new Date()
      });
    }
    this.resetModal();
  }
  resetModal() {
    this.showActivityPicker = false;
    this.selectedAppointment = null;
    this.newAppointment = { titolo: '', oraInizio: '09:00', oraFine: '10:00', dataIso: '', note: '' };
  }
  async eliminaAppuntamento(id: string, event: Event) {
    event.stopPropagation();
    this.deleteId = id;
    this.showDeleteModal = true;
  }
  async eliminaSelected() {
    if (!this.selectedAppointment) return;
    this.deleteId = this.selectedAppointment.id;
    this.showDeleteModal = true;
  }
  async confermaElimina() {
    if (!this.deleteId) return;
    await deleteDoc(doc(this.firestore, `appointments/${this.deleteId}`));
    this.showDeleteModal = false;
    this.deleteId = null;
    this.resetModal();
  }
  annullaElimina() {
    this.showDeleteModal = false;
    this.deleteId = null;
  }
}