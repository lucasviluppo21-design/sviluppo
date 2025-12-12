import { Injectable } from '@angular/core';
// Usa SOLO modular AngularFire!
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, map, of } from 'rxjs';

export interface Exercise {
  id: number;                        // id numerico per compatibilità UI
  name: string;
  category: string;
  image?: string;                    // URL pubblico consigliato
  description?: string;
  muscles?: string[];
  difficulty?: 'Facile' | 'Intermedio' | 'Difficile' | string;
  media?: string;                    // URL pubblico consigliato
}

@Injectable({ providedIn: 'root' })
export class EserciziService {
  private exercisesCache: Exercise[] = [];

  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {}

  getAll$(): Observable<Exercise[]> {
    if (!this.firestore) {
      console.error('Firestore not available - getAll$');
      return of([] as Exercise[]);
    }
    const exCol = collection(this.firestore, 'exercises');
    return collectionData(exCol, { idField: 'docId' }).pipe(
      map(list =>
        (list as any[]).map(e => ({
          id: e.numericId ?? 0,
          name: e.name,
          category: e.category,
          image: e.image,
          description: e.description,
          muscles: e.muscles,
          difficulty: e.difficulty,
          media: e.media
        }))
      )
    );
  }

  setExercises(list: Exercise[]) {
    this.exercisesCache = list || [];
  }
  
  getExerciseById(id: number): Exercise | null {
    return this.exercisesCache.find(e => e.id === id) || null;
  }

  getByNumericId$(id: number): Observable<Exercise | null> {
    if (!this.firestore) {
      console.error('Firestore not available - getByNumericId$');
      return of(null);
    }
    const exCol = collection(this.firestore, 'exercises');
    const q = query(exCol, where('numericId', '==', id));
    return collectionData(q).pipe(
      map(list => {
        const e = list[0] as any;
        if (!e) return null;
        return {
          id: e.numericId ?? 0,
          name: e.name,
          category: e.category,
          image: e.image,
          description: e.description,
          muscles: e.muscles,
          difficulty: e.difficulty,
          media: e.media
        } as Exercise;
      })
    );
  }

  async create(ex: Omit<Exercise, 'id'> & { imageDataUrl?: string; mediaDataUrl?: string }): Promise<Exercise> {
    if (!this.firestore) {
      throw new Error('Firestore not available - create exercise');
    }
    const exCol = collection(this.firestore, 'exercises');
    const docId = crypto.randomUUID();
    const numericId = Date.now();
    let imageUrl = ex.image;
    let mediaUrl = ex.media;

    if (ex.imageDataUrl?.startsWith('data:')) {
      imageUrl = await this.uploadDataUrl(`exercises/${docId}/${Date.now()}_image`, ex.imageDataUrl);
    }
    if (ex.mediaDataUrl?.startsWith('data:')) {
      mediaUrl = await this.uploadDataUrl(`exercises/${docId}/${Date.now()}_media`, ex.mediaDataUrl);
    }

    const payload = {
      numericId,
      name: ex.name,
      category: ex.category,
      image: imageUrl,
      description: ex.description,
      muscles: ex.muscles || [],
      difficulty: ex.difficulty,
      media: mediaUrl
    };

    await setDoc(doc(this.firestore, `exercises/${docId}`), payload);
    const created: Exercise = { id: numericId, ...payload } as Exercise;
    this.exercisesCache = [...this.exercisesCache, created];
    return created;
  }

  async updateByNumericId(id: number, patch: Partial<Exercise> & { imageDataUrl?: string; mediaDataUrl?: string }): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available - update exercise');
    }
    const exCol = collection(this.firestore, 'exercises');
    const q = query(exCol, where('numericId', '==', id));
    const snap = await getDocs(q);
    const docSnap = snap?.docs[0];
    if (!docSnap) return;

    const toUpdate: any = { ...patch };

    if (patch.imageDataUrl?.startsWith('data:')) {
      toUpdate.image = await this.uploadDataUrl(`exercises/${docSnap.id}/${Date.now()}_image`, patch.imageDataUrl);
      delete toUpdate.imageDataUrl;
    }
    if (patch.mediaDataUrl?.startsWith('data:')) {
      toUpdate.media = await this.uploadDataUrl(`exercises/${docSnap.id}/${Date.now()}_media`, patch.mediaDataUrl);
      delete toUpdate.mediaDataUrl;
    }

    await updateDoc(doc(this.firestore, `exercises/${docSnap.id}`), toUpdate);

    this.exercisesCache = this.exercisesCache.map(e => (e.id === id ? { ...e, ...toUpdate } : e));
  }

  async deleteByNumericId(id: number): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available - delete exercise');
    }
    const exCol = collection(this.firestore, 'exercises');
    const q = query(exCol, where('numericId', '==', id));
    const snap = await getDocs(q);
    const docSnap = snap?.docs[0];
    if (!docSnap) return;
    await deleteDoc(doc(this.firestore, `exercises/${docSnap.id}`));
    this.exercisesCache = this.exercisesCache.filter(e => e.id !== id);
  }

  private async uploadDataUrl(filePath: string, dataUrl: string): Promise<string> {
    if (!this.storage) {
      throw new Error('Storage not available - uploadDataUrl');
    }
    const storageRef = ref(this.storage, filePath);
    const blob = this.dataURLToBlob(dataUrl);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
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