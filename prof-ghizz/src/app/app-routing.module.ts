import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EserciziComponent } from './pages/esercizi/esercizi.component';
import { AnagraficaComponent } from './pages/anagrafica/anagrafica.component';
import { AnagraficaListComponent } from './pages/anagrafica-list/anagrafica-list.component';
import { AnagraficaDetailComponent } from './pages/anagrafica-detail/anagrafica-detail.component';
import { GestioneSchedeComponent } from './pages/gestione-schede/gestione-schede.component';
import { DettaglioEserciziComponent } from './pages/dettaglio-esercizi/dettaglio-esercizi.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'esercizi', component: EserciziComponent, canActivate: [AuthGuard] },
  { path: 'esercizi/:id', component: DettaglioEserciziComponent, canActivate: [AuthGuard] },
  { path: 'anagrafica', component: AnagraficaComponent, canActivate: [AuthGuard] },
  { path: 'anagrafica/list', component: AnagraficaListComponent, canActivate: [AuthGuard] },
  { path: 'anagrafica/:id', component: AnagraficaDetailComponent, canActivate: [AuthGuard] },
  { path: 'gestione-schede', component: GestioneSchedeComponent, canActivate: [AuthGuard] },
  // lazy load del componente standalone pubblico
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}