import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// MODULAR AngularFire
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';

import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

// Tipi dell'app
export interface Exercise {
  id: string;
  name: string;
  category: string;
  image?: string;
}

interface Category {
  id: string;
  name: string;
  image?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-esercizi',
  templateUrl: './esercizi.component.html',
  styleUrls: ['./esercizi.component.css'],
  standalone: false
})
export class EserciziComponent implements OnInit {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  exercises: Exercise[] = [];
  categories: Category[] = [];

  showExerciseModal = false;
  showCategoryModal = false;
  showEditCategoryModal = false;
  showDeleteCategoryModal = false;

  showAllExercisesModal = false;
  showAllCategoriesModal = false;

  categoryToEdit: Category | null = null;
  categoryToDelete: Category | null = null;

  exerciseName = '';
  exerciseCategory = '';
  exerciseImage = '';

  exerciseCategoryInput = '';
  showCategoryDropdown = false;
  categorySuggestions: Category[] = [];
  highlightedSuggestionIndex = -1;
  allowInlineCreate = false;

  autoCatMatched = false;

  categoryName = '';
  categoryImage = '';

  editCategoryName = '';
  editCategoryImage = '';

  categorySearch = '';
  exerciseSearch = '';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.subscribeCollections();
    const nav = this.router.getCurrentNavigation();
    const refresh = nav?.extras?.state && (nav.extras.state as any).refresh;
    if (refresh) {
      // le sottoscrizioni dei dati sono live
    }
  }

  private subscribeCollections(): void {
    // Exercises
    const exCol = collection(this.firestore, 'exercises');
    collectionData(exCol, { idField: 'id' }).subscribe(list => {
      this.exercises = list as Exercise[];
    });
    // Categories
    const catCol = collection(this.firestore, 'categories');
    collectionData(catCol, { idField: 'id' }).subscribe(list => {
      this.categories = (list as Category[]).map(c => ({ ...c, selected: c.selected ?? false }));
    });
  }

  openExerciseModal(): void {
    this.showExerciseModal = true;
    this.exerciseName = '';
    this.exerciseCategory = '';
    this.exerciseImage = '';
    this.exerciseCategoryInput = '';
    this.autoCatMatched = false;
    this.showCategoryDropdown = false;
    this.categorySuggestions = [];
    this.highlightedSuggestionIndex = -1;
    this.allowInlineCreate = false;
  }
  closeExerciseModal(): void {
    this.showExerciseModal = false;
    this.exerciseName = '';
    this.exerciseCategory = '';
    this.exerciseImage = '';
    this.exerciseCategoryInput = '';
    this.autoCatMatched = false;
    this.showCategoryDropdown = false;
    this.highlightedSuggestionIndex = -1;
  }
  onExerciseImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.exerciseImage = reader.result as string;
    reader.readAsDataURL(file);
  }

  // NUOVO AUTOCOMPLETE CATEGORIA
  onAutoCategoryInput(): void {
    this.autoCatMatched = false;
    const typed = this.exerciseCategoryInput.trim();
    if (typed.length < 3) return;
    const match = this.categories.find(
      cat => cat.name.toLowerCase().startsWith(typed.toLowerCase())
    );
    if (match) {
      this.exerciseCategoryInput = match.name;
      this.autoCatMatched = true;
    }
  }
  onAutoCategoryBlur(): void {
    const typed = this.exerciseCategoryInput.trim();
    if (typed.length < 3) return;
    const match = this.categories.find(
      cat => cat.name.toLowerCase().startsWith(typed.toLowerCase())
    );
    if (match) {
      this.exerciseCategoryInput = match.name;
      this.autoCatMatched = true;
    }
  }
  clearCategoryInput(): void {
    this.exerciseCategoryInput = '';
    this.autoCatMatched = false;
  }

  // AUTOCOMPLETE VECCHIO (DROPDOWN)
  updateCategorySuggestions(): void {
    const term = this.exerciseCategoryInput.trim().toLowerCase();
    if (!term) {
      this.categorySuggestions = this.categories.slice(0, 50);
      this.allowInlineCreate = false;
    } else {
      this.categorySuggestions = this.categories
        .filter(c => c.name.toLowerCase().includes(term))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 50);
      this.allowInlineCreate = !this.categorySuggestions.some(c => c.name.toLowerCase() === term);
    }
    this.highlightedSuggestionIndex = this.categorySuggestions.length ? 0 : -1;
    this.showCategoryDropdown = true;
  }
  openCategoryDropdown(): void {
    this.showCategoryDropdown = true;
    this.updateCategorySuggestions();
  }
  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
    if (this.showCategoryDropdown) this.updateCategorySuggestions();
  }
  deferCloseCategoryDropdown(): void {
    setTimeout(() => {
      this.showCategoryDropdown = false;
      this.highlightedSuggestionIndex = -1;
    }, 170);
  }
  selectCategory(name: string): void {
    this.exerciseCategoryInput = name;
    this.exerciseCategory = name;
    this.showCategoryDropdown = false;
    this.highlightedSuggestionIndex = -1;
  }
  onCategoryInputKeydown(ev: KeyboardEvent): void {
    if (!this.showCategoryDropdown && ['ArrowDown', 'ArrowUp', 'Enter'].includes(ev.key)) {
      this.openCategoryDropdown();
      return;
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (this.categorySuggestions.length) {
        this.highlightedSuggestionIndex =
          (this.highlightedSuggestionIndex + 1) % this.categorySuggestions.length;
      }
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (this.categorySuggestions.length) {
        this.highlightedSuggestionIndex =
          (this.highlightedSuggestionIndex - 1 + this.categorySuggestions.length) % this.categorySuggestions.length;
      }
    } else if (ev.key === 'Enter') {
      if (this.showCategoryDropdown) {
        ev.preventDefault();
        if (this.highlightedSuggestionIndex >= 0 && this.categorySuggestions.length) {
          this.selectCategory(this.categorySuggestions[this.highlightedSuggestionIndex].name);
        } else if (this.allowInlineCreate && this.exerciseCategoryInput.trim()) {
          this.createInlineCategory();
        } else {
          this.showCategoryDropdown = false;
        }
      }
    } else if (ev.key === 'Escape') {
      this.showCategoryDropdown = false;
      this.highlightedSuggestionIndex = -1;
    }
  }

  async createInlineCategory(): Promise<void> {
    const name = this.exerciseCategoryInput.trim();
    if (!name) return;
    if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      this.selectCategory(name);
      return;
    }
    const id = crypto.randomUUID();
    const newCategory: Category = {
      id,
      name,
      image: '',
      selected: false
    };
    await this.authService.ensureSignedIn();
    const categoryDoc = doc(this.firestore, `categories/${id}`);
    try {
      await setDoc(categoryDoc, newCategory);
    } catch (err) {
      console.error('Error creating inline category', err);
    }
    this.selectCategory(name);
    this.allowInlineCreate = false;
  }

  // SALVATAGGIO ESERCIZIO
  async saveExercise(): Promise<void> {
    const name = this.exerciseName.trim();
    const catInput = this.exerciseCategoryInput.trim();
    if (!name || !catInput) return;
    // Normalizza categoria
    let finalCategory = catInput;
    const match = this.categories.find(
      cat => cat.name.toLowerCase() === catInput.toLowerCase()
    );
    if (!match) {
      await this.createInlineCategory();
      finalCategory = this.exerciseCategoryInput.trim();
    } else {
      finalCategory = match.name;
    }
    const id = crypto.randomUUID();
    let imageUrl: string | undefined = this.exerciseImage || undefined;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const filePath = `exercises/${id}/${Date.now()}_image`;
      const storageRef = ref(this.storage, filePath);
      const blob = this.dataURLToBlob(imageUrl);
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
    }
    const newExercise: Exercise = {
      id,
      name,
      category: finalCategory,
      image: imageUrl
    };
    await this.authService.ensureSignedIn();
    const exDoc = doc(this.firestore, `exercises/${id}`);
    try {
      await setDoc(exDoc, newExercise);
    } catch (err) {
      console.error('Error saving exercise', err);
    }
    this.closeExerciseModal();
  }

  /* ## CATEGORIE: MODALE, EDIT, DELETE, ... ## */
  openCategoryModal(): void {
    this.showCategoryModal = true;
    this.categoryName = '';
    this.categoryImage = '';
  }
  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.categoryName = '';
    this.categoryImage = '';
  }
  onCategoryImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.categoryImage = reader.result as string;
    reader.readAsDataURL(file);
  }
  async saveCategory(): Promise<void> {
    if (!this.categoryName.trim()) return;
    const id = crypto.randomUUID();
    let catImageUrl: string | undefined = this.categoryImage || undefined;
    if (catImageUrl && catImageUrl.startsWith('data:')) {
      const filePath = `categories/${id}/${Date.now()}_image`;
      const storageRef = ref(this.storage, filePath);
      const blob = this.dataURLToBlob(catImageUrl);
      await uploadBytes(storageRef, blob);
      catImageUrl = await getDownloadURL(storageRef);
    }
    const newCategory: Category = {
      id,
      name: this.categoryName.trim(),
      image: catImageUrl,
      selected: false
    };
    await this.authService.ensureSignedIn();
    const catDoc = doc(this.firestore, `categories/${id}`);
    try {
      await setDoc(catDoc, newCategory);
    } catch (err) {
      console.error('Error saving category', err);
    }
    this.closeCategoryModal();
  }
  openEditCategoryModal(cat: Category): void {
    this.categoryToEdit = cat;
    this.editCategoryName = cat.name;
    this.editCategoryImage = cat.image || '';
    this.showEditCategoryModal = true;
  }
  closeEditCategoryModal(): void {
    this.showEditCategoryModal = false;
    this.categoryToEdit = null;
    this.editCategoryName = '';
    this.editCategoryImage = '';
  }
  onEditCategoryImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.editCategoryImage = reader.result as string;
    reader.readAsDataURL(file);
  }
  async saveEditCategory(): Promise<void> {
    if (!this.categoryToEdit) return;
    const id = this.categoryToEdit.id;
    let updatedImageUrl: string | undefined = this.editCategoryImage || undefined;
    if (updatedImageUrl && updatedImageUrl.startsWith('data:')) {
      const filePath = `categories/${id}/${Date.now()}_image`;
      const storageRef = ref(this.storage, filePath);
      const blob = this.dataURLToBlob(updatedImageUrl);
      await uploadBytes(storageRef, blob);
      updatedImageUrl = await getDownloadURL(storageRef);
    }
    const catDoc = doc(this.firestore, `categories/${id}`);
    try {
      await updateDoc(catDoc, {
        name: this.editCategoryName.trim(),
        image: updatedImageUrl
      });
    } catch (err) {
      console.error('Error updating category', err);
    }
    this.closeEditCategoryModal();
    if (this.showExerciseModal) this.updateCategorySuggestions();
  }
  onCategoryToggle(cat: Category, checked: boolean): void {
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
  confirmRemoveCategory(cat: Category): void {
    this.categoryToDelete = cat;
    this.showDeleteCategoryModal = true;
  }
  closeDeleteCategoryModal(): void {
    this.showDeleteCategoryModal = false;
    this.categoryToDelete = null;
  }
  async removeCategoryConfirmed(): Promise<void> {
    if (!this.categoryToDelete) return;
    const id = this.categoryToDelete.id;
    const removedName = this.categoryToDelete.name;
    const catDoc = doc(this.firestore, `categories/${id}`);
    try {
      await deleteDoc(catDoc);
    } catch (err) {
      console.error('Error deleting category', err);
    }
    // Elimina esercizi associati...
    const exCol = collection(this.firestore, 'exercises');
    const exQuery = query(exCol, where('category', '==', removedName));
    const snapshot = await getDocs(exQuery);
    for (const snap of snapshot.docs) {
      try {
        await deleteDoc(doc(this.firestore, `exercises/${snap.id}`));
      } catch (err) {
        console.error('Error deleting exercise', snap.id, err);
      }
    }
    if (this.exerciseCategoryInput === removedName) {
      this.exerciseCategoryInput = '';
      this.exerciseCategory = '';
    }
    this.closeDeleteCategoryModal();
    if (this.showExerciseModal) this.updateCategorySuggestions();
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
  get filteredCategoriesLimited(): Category[] {
    const term = this.categorySearch.trim().toLowerCase();
    let list = term ? this.categories.filter(c => c.name.toLowerCase().includes(term)) : this.categories;
    return list.slice(0, 5);
  }
  get allExercisesForModal(): Exercise[] {
    const selected = this.selectedCategoryNames[0];
    let list = selected ? this.exercises.filter(e => e.category === selected) : this.exercises;
    const term = this.exerciseSearch.trim().toLowerCase();
    if (term) list = list.filter(e => e.name.toLowerCase().includes(term));
    return list;
  }
  get allCategoriesForModal(): Category[] {
    const term = this.categorySearch.trim().toLowerCase();
    return term ? this.categories.filter(c => c.name.toLowerCase().includes(term)) : this.categories;
  }
  openAllExercisesModal(): void { this.showAllExercisesModal = true; }
  closeAllExercisesModal(): void { this.showAllExercisesModal = false; }
  openAllCategoriesModal(): void { this.showAllCategoriesModal = true; }
  closeAllCategoriesModal(): void { this.showAllCategoriesModal = false; }
  openDetail(exercise: Exercise): void {
    this.router.navigate(['/esercizi', exercise.id], { state: { exercise } });
  }
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