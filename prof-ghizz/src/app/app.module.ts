import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { HeaderComponent } from './layout/header.component';
import { SidebarComponent } from './layout/sidebar.component';
import { HomeComponent } from './pages/home/home.component';
import { AnagraficaComponent } from './pages/anagrafica/anagrafica.component';
import { AnagraficaListComponent } from './pages/anagrafica-list/anagrafica-list.component';
import { AnagraficaDetailComponent } from './pages/anagrafica-detail/anagrafica-detail.component';
import { GestioneSchedeComponent } from './pages/gestione-schede/gestione-schede.component';

// Standalone components: si importano, NON si dichiarano
import { EserciziComponent } from './pages/esercizi/esercizi.component';
import { DettaglioEserciziComponent } from './pages/dettaglio-esercizi/dettaglio-esercizi.component';

import { FirebaseService } from './services/firebase.service';
import { environment } from '../environments/environment';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    HomeComponent,
    AnagraficaComponent,
    AnagraficaListComponent,
    AnagraficaDetailComponent,
    GestioneSchedeComponent
    // Non dichiarare componenti standalone qui
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    // Importa componenti standalone
    EserciziComponent,
    DettaglioEserciziComponent,
    // AngularFire compat modules
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [
    FirebaseService,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAnalytics(() => getAnalytics())
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}