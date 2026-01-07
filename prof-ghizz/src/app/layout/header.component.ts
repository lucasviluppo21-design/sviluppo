import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false,
})
export class HeaderComponent {
  appVersion = environment.version;

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}