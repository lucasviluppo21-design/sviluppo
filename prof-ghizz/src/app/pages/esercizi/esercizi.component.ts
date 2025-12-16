import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { EserciziService, Exercise } from '../../services/esercizi.service';
import { CategorieService, Category } from '../../services/categorie.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-esercizi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './esercizi.component.html',
  styleUrls: ['./esercizi.component.css']
})
export class EserciziComponent implements OnInit, OnDestroy {
  exercises: Exercise[] = [];
  categories: Array<Category & { selected?: boolean }> = [];
  subscriptions: Subscription[] = [];

  exerciseName = '';
  exerciseCategoryInput = '';
  exerciseImageFile: File | null = null;
  exerciseImage: string | null = null;
  exerciseSearch = '';

  categoryName = '';
  categoryImageFile: File | null = null;
  categoryImage: string | null = null;
  categorySearch = '';

  showExerciseModal = false;
  showCategoryModal = false;
  showEditCategoryModal = false;
  showDeleteCategoryModal = false;
  showAllExercisesModal = false;
  showAllCategoriesModal = false;

  categoryToEdit: Category | null = null;
  categoryToDelete: Category | null = null;
  editCategoryName = '';
  editCategoryImageFile: File | null = null;
  editCategoryImage: string | null = null;

  autoCatMatched = false;

  constructor(
    private eserciziService: EserciziService,
    private categorieService: CategorieService,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    this.loadExercises();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadExercises(): void {
    const sub = this.eserciziService.getAll$().subscribe((list: Exercise[]) => {
      this.exercises = list;
    });
    this.subscriptions.push(sub);
  }

  loadCategories(): void {
    const sub = this.categorieService.getAll$().subscribe((list: Category[]) => {
      this.categories = list.map((c: Category) => ({ ...c, selected: false }));
    });
    this.subscriptions.push(sub);
  }

  onExerciseImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.exerciseImageFile = file;
    if (file) {
      this.imageService.compressAndConvertToBase64(file, 1000, 256)
        .then((img: string) => this.exerciseImage = img);
    } else {
      this.exerciseImage = null;
    }
  }

  onCategoryImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.categoryImageFile = file;
    if (file) {
      this.imageService.compressAndConvertToBase64(file, 1000, 128)
        .then((img: string) => this.categoryImage = img);
    } else {
      this.categoryImage = null;
    }
  }

  onEditCategoryImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.editCategoryImageFile = file;
    if (file) {
      this.imageService.compressAndConvertToBase64(file, 1000, 128)
        .then((img: string) => this.editCategoryImage = img);
    } else {
      this.editCategoryImage = null;
    }
  }

  async saveExercise(): Promise<void> {
    const imgData = this.exerciseImage ?? undefined;
    const exercise: Omit<Exercise, 'id'> = {
      name: this.exerciseName.trim(),
      category: this.exerciseCategoryInput.trim(),
      image: imgData,
    };
    await this.eserciziService.create(exercise);
    this.closeExerciseModal();
    this.loadExercises();
  }

  async saveCategory(): Promise<void> {
    const imgData = this.categoryImage ?? undefined;
    const category: Omit<Category, 'id'> = {
      name: this.categoryName.trim(),
      image: imgData,
    };
    await this.categorieService.create(category);
    this.closeCategoryModal();
    this.loadCategories();
  }

  // AGGIORNATO - aggiorna anche gli esercizi che usavano quella categoria
  async saveEditCategory(): Promise<void> {
    if (!this.categoryToEdit) return;

    const oldName = this.categoryToEdit.name;
    const newName = this.editCategoryName.trim();
    const imgData = this.editCategoryImage ?? this.categoryToEdit.image;
    const updateData: Partial<Category> = {
      name: newName,
      image: imgData,
    };

    // 1. Aggiorna la categoria
    await this.categorieService.update(this.categoryToEdit.id, updateData);

    // 2. Recupera tutti gli esercizi
    const exercises: Exercise[] = await this.eserciziService.getAll();

    // 3. Aggiorna la categoria degli esercizi che usavano quella vecchia
    const affected = exercises.filter(e => e.category === oldName);
    for (const ex of affected) {
      await this.eserciziService.update(ex.id, { category: newName });
    }

    this.closeEditCategoryModal();
    this.loadCategories();
    this.loadExercises();
  }

  openExerciseModal(): void {
    this.exerciseName = '';
    this.exerciseCategoryInput = '';
    this.exerciseImageFile = null;
    this.exerciseImage = null;
    this.showExerciseModal = true;
  }
  closeExerciseModal(): void {
    this.showExerciseModal = false;
    this.exerciseName = '';
    this.exerciseCategoryInput = '';
    this.exerciseImageFile = null;
    this.exerciseImage = null;
  }
  openCategoryModal(): void {
    this.categoryName = '';
    this.categoryImageFile = null;
    this.categoryImage = null;
    this.showCategoryModal = true;
  }
  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.categoryName = '';
    this.categoryImageFile = null;
    this.categoryImage = null;
  }
  openEditCategoryModal(cat: Category): void {
    this.categoryToEdit = cat;
    this.editCategoryName = cat.name;
    this.editCategoryImage = cat.image || null;
    this.editCategoryImageFile = null;
    this.showEditCategoryModal = true;
  }
  closeEditCategoryModal(): void {
    this.showEditCategoryModal = false;
    this.categoryToEdit = null;
    this.editCategoryName = '';
    this.editCategoryImage = null;
    this.editCategoryImageFile = null;
  }
  openAllExercisesModal(): void { this.showAllExercisesModal = true; }
  closeAllExercisesModal(): void { this.showAllExercisesModal = false; }
  openAllCategoriesModal(): void { this.showAllCategoriesModal = true; }
  closeAllCategoriesModal(): void { this.showAllCategoriesModal = false; }
  confirmRemoveCategory(cat: Category): void {
    this.categoryToDelete = cat;
    this.showDeleteCategoryModal = true;
  }
  closeDeleteCategoryModal(): void {
    this.categoryToDelete = null;
    this.showDeleteCategoryModal = false;
  }
  async removeCategoryConfirmed(): Promise<void> {
    if (!this.categoryToDelete) return;
    await this.categorieService.delete(this.categoryToDelete.id);
    this.closeDeleteCategoryModal();
    this.loadCategories();
  }

  onAutoCategoryInput(): void {
    this.autoCatMatched = false;
    const typed = this.exerciseCategoryInput.trim();
    if (typed.length < 3) return;
    const match = this.categories.find(cat =>
      cat.name.toLowerCase().startsWith(typed.toLowerCase())
    );
    if (match) {
      this.exerciseCategoryInput = match.name;
      this.autoCatMatched = true;
    }
  }
  onAutoCategoryBlur(): void {
    this.onAutoCategoryInput();
  }
  clearCategoryInput(): void {
    this.exerciseCategoryInput = '';
    this.autoCatMatched = false;
  }

  onCategoryToggle(cat: Category & { selected?: boolean }, checked: boolean): void {
    if (checked) {
      this.categories.forEach(c => c.selected = c.id === cat.id);
    } else {
      this.categories.forEach(c => c.selected = false);
    }
    this.categories = [...this.categories];
  }
  resetCategorySelections(): void {
    this.categories.forEach(c => c.selected = false);
    this.categories = [...this.categories];
  }
  get selectedCategoryNames(): string[] {
    return this.categories.filter(c => c.selected).map(c => c.name);
  }
  get filteredExercisesLimited(): Exercise[] {
    const selected = this.selectedCategoryNames[0];
    let list = selected ? this.exercises.filter(e => e.category === selected) : this.exercises;
    const term = this.exerciseSearch.trim().toLowerCase();
    if (term) list = list.filter(e => e.name.toLowerCase().includes(term));
    return list.slice(0, 5);
  }
  get allExercisesForModal(): Exercise[] {
    const selected = this.selectedCategoryNames[0];
    let list = selected ? this.exercises.filter(e => e.category === selected) : this.exercises;
    const term = this.exerciseSearch.trim().toLowerCase();
    if (term) list = list.filter(e => e.name.toLowerCase().includes(term));
    return list;
  }
  get filteredCategoriesLimited(): Category[] {
    const term = this.categorySearch.trim().toLowerCase();
    let list = term ? this.categories.filter(c => c.name.toLowerCase().includes(term)) : this.categories;
    return list.slice(0, 5);
  }
  get allCategoriesForModal(): Category[] {
    const term = this.categorySearch.trim().toLowerCase();
    return term ? this.categories.filter(c => c.name.toLowerCase().includes(term)) : this.categories;
  }
}