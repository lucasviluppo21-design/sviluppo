import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EserciziService, Exercise } from '../../services/esercizi.service';

interface EditExerciseForm {
  name: string;
  category: string;
  posizionamento?: string;
  esecuzione?: string;
  ritorno?: string;
  accorgimenti?: string;
  obiettivo?: string;
  description?: string;
  muscles: string[];
  difficulty: 'Facile' | 'Intermedio' | 'Difficile' | string;
  image?: string | undefined;
  media?: string | null;
  notes?: string;
}

@Component({
  selector: 'app-dettaglio-esercizi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dettaglio-esercizi.component.html',
  styleUrls: ['./dettaglio-esercizi.component.css']
})
export class DettaglioEserciziComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  exerciseId: string | null = null;
  exercise: Exercise | null = null;
  editMode = false;

  editForm: EditExerciseForm = {
    name: '',
    category: '',
    posizionamento: '',
    esecuzione: '',
    ritorno: '',
    accorgimenti: '',
    obiettivo: '',
    description: '',
    muscles: [],
    difficulty: 'Intermedio',
    image: undefined,
    media: null,
    notes: '',
  };

  newMuscle = '';

  loading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eserciziService: EserciziService
  ) {}

  async ngOnInit() {
    this.exerciseId = this.route.snapshot.paramMap.get('id');
    if (!this.exerciseId) {
      this.exercise = null;
      this.notFound = true;
      this.loading = false;
      return;
    }

    try {
      const allExercises = await this.eserciziService.getAll();
      const found = allExercises.find(e => e.id === this.exerciseId);
      if (!found) {
        this.exercise = null;
        this.notFound = true;
      } else {
        this.exercise = found;
        this.populateForm(found);
      }
    } catch (e) {
      this.exercise = null;
      this.notFound = true;
    }
    this.loading = false;
  }

  populateForm(ex: Exercise) {
    this.editForm = {
      name: ex.name,
      category: ex.category,
      posizionamento: (ex as any).posizionamento ?? '',
      esecuzione: (ex as any).esecuzione ?? '',
      ritorno: (ex as any).ritorno ?? '',
      accorgimenti: (ex as any).accorgimenti ?? '',
      obiettivo: (ex as any).obiettivo ?? '',
      description: ex.description ?? '',
      muscles: ex.muscles ?? [],
      difficulty: (ex.difficulty as 'Facile' | 'Intermedio' | 'Difficile') ?? 'Intermedio',
      image: ex.image ?? undefined,
      media: null,
      notes: (ex as any).notes ?? '',
    };
  }

  backToList(): void {
    this.router.navigate(['/esercizi']);
  }

  enableEdit(): void { this.editMode = true; }
  cancelEdit(): void {
    if (this.exercise) this.populateForm(this.exercise);
    this.editMode = false;
  }
  async saveExercise(): Promise<void> {
    if (!this.exercise) return;
    const payload = {
      name: this.editForm.name,
      category: this.editForm.category,
      posizionamento: this.editForm.posizionamento ?? '',
      esecuzione: this.editForm.esecuzione ?? '',
      ritorno: this.editForm.ritorno ?? '',
      accorgimenti: this.editForm.accorgimenti ?? '',
      obiettivo: this.editForm.obiettivo ?? '',
      description: this.editForm.description,
      muscles: this.editForm.muscles,
      difficulty: this.editForm.difficulty,
      image: this.editForm.image ?? undefined,
      notes: this.editForm.notes ?? '',
    };
    await this.eserciziService.update(this.exercise.id, payload);
    this.exercise = { ...this.exercise, ...payload };
    this.editMode = false;
  }

  addMuscle(): void {
    const m = this.newMuscle.trim();
    if (m) {
      this.editForm.muscles.push(m);
      this.newMuscle = '';
    }
  }
  removeMuscle(index: number): void {
    this.editForm.muscles.splice(index, 1);
  }

  onMediaBoxClick(): void {
    if (this.editMode) this.fileInputRef?.nativeElement?.click();
  }

  onMediaChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.editForm.media = reader.result as string; };
    reader.readAsDataURL(file);
  }
}