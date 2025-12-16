import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collectionData
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

export interface Category {
  id: string;
  name: string;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class CategorieService {
  constructor(private firestore: Firestore) {}

  getAll$(): Observable<Category[]> {
    const catCol = collection(this.firestore, 'categories');
    return collectionData(catCol, { idField: 'id' }).pipe(
      map(list =>
        (list as any[]).map(doc => ({
          id: doc.id,
          name: doc.name,
          image: doc.image
        }))
      )
    );
  }

  async create(cat: Omit<Category, 'id'>): Promise<Category> {
    const id = crypto.randomUUID();
    const payload = { id, name: cat.name, image: cat.image };
    await setDoc(doc(this.firestore, `categories/${id}`), payload);
    return payload;
  }

  async update(id: string, data: Partial<Category>): Promise<void> {
    await updateDoc(doc(this.firestore, `categories/${id}`), data);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `categories/${id}`));
  }
}