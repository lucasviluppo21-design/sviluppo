import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  image?: string; // base64
  description?: string;
  muscles?: string[];
  difficulty?: 'Facile' | 'Intermedio' | 'Difficile' | string;
}

@Injectable({ providedIn: 'root' })
export class EserciziService {
  constructor(private firestore: Firestore) {}

  // Restituisce observable per ascolto in tempo reale
  getAll$(): Observable<Exercise[]> {
    const exCol = collection(this.firestore, 'exercises');
    return collectionData(exCol, { idField: 'id' }) as Observable<Exercise[]>;
  }

  // Restituisce una Promise con TUTTI gli esercizi (snapshot singolo, non realtime)
  async getAll(): Promise<Exercise[]> {
    const exCol = collection(this.firestore, 'exercises');
    return await firstValueFrom(collectionData(exCol, { idField: 'id' })) as Exercise[];
  }

  async create(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
    const exCol = collection(this.firestore, 'exercises');
    const docRef = doc(exCol);
    const payload = { ...exercise };
    await setDoc(docRef, payload);
    // docRef.id è disponibile su docRef con compatibilità AngularFire
    return { id: (docRef as any).id, ...payload };
  }

  async update(id: string, data: Partial<Exercise>): Promise<void> {
    await updateDoc(doc(this.firestore as any, `exercises/${id}`), data);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore as any, `exercises/${id}`));
  }
}