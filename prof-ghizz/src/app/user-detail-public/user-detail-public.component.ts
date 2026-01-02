import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-user-detail-public',
  templateUrl: './user-detail-public.component.html',
  styleUrls: ['./user-detail-public.component.css']
})
export class UserDetailPublicComponent implements OnInit {
  // Componente deprecato: reindirizza al nuovo percorso pubblico diretto al PDF
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    const cardIndex = this.route.snapshot.paramMap.get('cardIndex');
    if (userId && cardIndex !== null) {
      // reindirizza in modo che i vecchi link continuino a funzionare
      this.router.navigateByUrl(`/public-pdf/${userId}/${cardIndex}`);
    } else {
      this.router.navigateByUrl('/');
    }
  }
}