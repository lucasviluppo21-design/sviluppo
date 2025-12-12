import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';

// PASSA A API MODULARI DI ANGULARFIRE (no compat)
import { Firestore, doc, docData, setDoc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { AuthService } from '../../services/auth.service';

export interface Exercise {
  id: string;               // usa string per id Firestore
  name: string;
  description?: string;
  image?: string;           // URL pubblico o base64
  media?: string;           // URL pubblico o base64 (preferibilmente URL)
  muscles?: string[];
}

@Component({
  selector: 'app-dettaglio-esercizi',
  templateUrl: './dettaglio-esercizi.component.html',
  styleUrls: ['./dettaglio-esercizi.component.css'],
  standalone: false
})
export class DettaglioEserciziComponent implements OnInit {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  exercise: Exercise | null = null;
  editMode = false;
  editForm: Partial<Exercise> = {};
  notes = '';
  newMuscle = '';

  @ViewChild('fileInput', { static: false }) fileInputRef?: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    // Prova a prendere lo stato di navigazione
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras as NavigationExtras)?.state as { exercise?: Exercise } | undefined;

    if (state?.exercise) {
      // Se è passato via router state, usa quello
      this.exercise = state.exercise;
      this.editForm = { ...this.exercise };
    } else {
      // Altrimenti carica da Firestore in base all'id nella route
      const routeIdRaw = this.route.snapshot.paramMap.get('id');
      const routeId = (routeIdRaw ?? '').toString(); // use string id
      if (!routeId) {
        this.exercise = null;
      } else {
        const docRef = doc(this.firestore, `exercises/${routeId}`);
        const snap = await getDoc(docRef);
        this.exercise = (snap.exists() ? (snap.data() as Exercise) : null);
        if (this.exercise) {
          // Assicurati di avere l'id nel modello se non salvato come campo
          this.exercise.id = routeId;
          this.editForm = { ...this.exercise };
        }
      }
    }

    this.notes = 'Nessuna nota';
  }

  enableEdit(): void {
    if (!this.exercise) return;
    this.editMode = true;
    this.editForm = { ...this.exercise };
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editForm = this.exercise ? { ...this.exercise } : {};
  }

  // Salva l’esercizio su Firestore, caricando prima eventuale file su Storage
  async saveExercise(): Promise<void> {
    if (!this.exercise) return;

    // Se editForm.media è una base64 (data URL), caricala su Storage per ottenere un URL pubblico
    let resolvedMediaUrl: string | undefined = this.editForm.media;

    if (resolvedMediaUrl && resolvedMediaUrl.startsWith('data:')) {
      const filePath = `exercises/${this.exercise.id}/${Date.now()}_media`;
      const storageRef = ref(this.storage, filePath);
      const blob = this.dataURLToBlob(resolvedMediaUrl);
      try {
        await this.authService.ensureSignedIn();
        await uploadBytes(storageRef, blob);
        resolvedMediaUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error('Error uploading media', err);
      }
    }

    // Se editForm.image è una data URL, gestiscila allo stesso modo
    let resolvedImageUrl: string | undefined = this.editForm.image;
    if (resolvedImageUrl && resolvedImageUrl.startsWith('data:')) {
      const filePath = `exercises/${this.exercise.id}/${Date.now()}_image`;
      const storageRef = ref(this.storage, filePath);
      const blob = this.dataURLToBlob(resolvedImageUrl);
      try {
        await this.authService.ensureSignedIn();
        await uploadBytes(storageRef, blob);
        resolvedImageUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error('Error uploading image', err);
      }
    }

    const updated: Exercise = {
      ...this.exercise,
      ...this.editForm,
      image: resolvedMediaUrl ? resolvedMediaUrl : (resolvedImageUrl || this.exercise.image),
      media: resolvedMediaUrl || this.exercise.media,
    };

    // Scrivi su Firestore: exercises/{id}
    const exDoc = doc(this.firestore, `exercises/${updated.id}`);
    try {
      await this.authService.ensureSignedIn();
      await setDoc(exDoc, updated, { merge: true });
    } catch (err) {
      console.error('Error saving exercise details', err);
    }

    this.exercise = updated;
    this.editMode = false;

    // Torna alla lista
    this.router.navigate(['/esercizi'], { state: { refresh: true } });
  }

  backToList(): void {
    this.router.navigate(['/esercizi']);
  }

  onMediaBoxClick(): void {
    if (!this.editMode) return;
    this.fileInputRef?.nativeElement?.click();
  }

  // Carica file in memoria come dataURL; verrà convertito in upload su Storage al save
  onMediaChange(event: Event): void {
    if (!this.editMode) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.editForm.media = reader.result as string);
    reader.readAsDataURL(file);
  }

  addMuscle(): void {
    const val = (this.newMuscle || '').trim();
    if (!val) return;
    const list = Array.isArray(this.editForm.muscles) ? this.editForm.muscles : [];
    this.editForm.muscles = [...list, val];
    this.newMuscle = '';
  }

  removeMuscle(index: number): void {
    if (!Array.isArray(this.editForm.muscles)) return;
    this.editForm.muscles = this.editForm.muscles.filter((_, i) => i !== index);
  }

  // Utility: converti dataURL (base64) in Blob per upload su Storage
  private dataURLToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}