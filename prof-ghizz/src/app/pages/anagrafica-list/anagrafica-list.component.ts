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
  // Solo visualizzazione (nessuna logica di filtro qui)
  users: User[] = [];
  filteredUsers: User[] = [];

  constructor(private userService: UserService) {}

  async ngOnInit() {
    const allUsers = await this.userService.getAll();
    this.users = allUsers;
    this.filteredUsers = [...this.users];
  }
}