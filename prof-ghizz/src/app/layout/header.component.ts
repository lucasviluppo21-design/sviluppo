import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false
})
export class HeaderComponent {
  constructor(private fb: FirebaseService) {}

  async testDb() {
    try {
      const res = await this.fb.testWrite();
      if (res.ok) {
        alert('Test write OK, id: ' + res.id);
      } else {
        alert('Test write FAILED: ' + (res.error?.message || res.error));
        console.error(res.error);
      }
    } catch (err) {
      alert('Test write error: see console');
      console.error(err);
    }
  }
}
