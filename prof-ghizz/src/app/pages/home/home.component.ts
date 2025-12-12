import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  activeClients: number = 0;
  tessereAttive: User[] = [];
  tessereScadute: User[] = [];
  thisWeekCards: number = 0;
  totalExercises: number = 0;
  scaduteModalOpen: boolean = false;

  constructor(private userService: UserService) {}

  async ngOnInit() {
    const users: User[] = await this.userService.getAll();
    const today = new Date().toISOString().substring(0, 10);

    this.activeClients = users.filter(u => u.status === 'Attivo').length;

    // La tessera è "scaduta" se subscriptionEnd <= oggi
    this.tessereScadute = users.filter(u => u.subscriptionEnd && u.subscriptionEnd <= today);
    this.tessereAttive = users.filter(u => u.subscriptionEnd && u.subscriptionEnd > today);

    // thisWeekCards = await this.userService.getSchedeQuestaSettimana();
    // this.totalExercises = await this.userService.getEserciziTotali();
  }

  openScaduteModal() {
    this.scaduteModalOpen = true;
  }

  closeScaduteModal() {
    this.scaduteModalOpen = false;
  }
}