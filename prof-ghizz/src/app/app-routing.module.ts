import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EserciziComponent } from './pages/esercizi/esercizi.component';
import { AnagraficaComponent } from './pages/anagrafica/anagrafica.component';
import { AnagraficaListComponent } from './pages/anagrafica-list/anagrafica-list.component';
import { AnagraficaDetailComponent } from './pages/anagrafica-detail/anagrafica-detail.component';
import { GestioneSchedeComponent } from './pages/gestione-schede/gestione-schede.component';
import { DettaglioEserciziComponent } from './pages/dettaglio-esercizi/dettaglio-esercizi.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'esercizi', component: EserciziComponent },
  { path: 'esercizi/:id', component: DettaglioEserciziComponent },
  { path: 'anagrafica', component: AnagraficaComponent },
  { path: 'anagrafica/list', component: AnagraficaListComponent },
  { path: 'anagrafica/:id', component: AnagraficaDetailComponent },
  { path: 'gestione-schede', component: GestioneSchedeComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}