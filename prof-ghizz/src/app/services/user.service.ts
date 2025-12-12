import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, map, of } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  getAll$(): Observable<User[]> {
    if (!this.firestore) {
      return of([] as User[]);
    }
    const usersCol = collection(this.firestore, 'users');
    return collectionData(usersCol, { idField: 'id' }).pipe(
      map(list =>
        (list as any[]).map(d => ({
          id: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          signupDate: d.signupDate || "",
          avatarUrl: d.avatarUrl || "",
          status: d.status ?? "Attivo",
          birthDate: d.birthDate ?? "",
          gender: d.gender ?? "",
          address: d.address ?? "",
          city: d.city ?? "",
          cap: d.cap ?? "",
          personalNotes: d.personalNotes ?? "",
          subscriptionEnd: d.subscriptionEnd ?? "",
          cards: d.cards ?? []
        }))
      )
    );
  }

  async getAll(): Promise<User[]> {
    if (!this.firestore) {
      return [];
    }
    const usersCol = collection(this.firestore, 'users');
    const snap = await getDocs(usersCol);
    return snap.docs.map(docSnap => {
      const d = docSnap.data() as any;
      return {
        id: docSnap.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        signupDate: d.signupDate || "",
        avatarUrl: d.avatarUrl || "",
        status: d.status ?? "Attivo",
        birthDate: d.birthDate ?? "",
        gender: d.gender ?? "",
        address: d.address ?? "",
        city: d.city ?? "",
        cap: d.cap ?? "",
        personalNotes: d.personalNotes ?? "",
        subscriptionEnd: d.subscriptionEnd ?? "",
        cards: d.cards ?? []
      } as User;
    });
  }

  getById$(id: string): Observable<User | undefined> {
    if (!this.firestore) {
      return of(undefined);
    }
    const usersCol = collection(this.firestore, 'users');
    return collectionData(usersCol, { idField: 'id' }).pipe(
      map((list: any[]) => list.find(u => u.id === id) as User)
    );
  }

  async getById(id: string): Promise<User | undefined> {
    if (!this.firestore) {
      return undefined;
    }
    const userDocRef = doc(this.firestore, `users/${id}`);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return undefined;
    const d = snap.data() as any;
    return {
      id: snap.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      signupDate: d.signupDate || "",
      avatarUrl: d.avatarUrl || "",
      status: d.status ?? "Attivo",
      birthDate: d.birthDate ?? "",
      gender: d.gender ?? "",
      address: d.address ?? "",
      city: d.city ?? "",
      cap: d.cap ?? "",
      personalNotes: d.personalNotes ?? "",
      subscriptionEnd: d.subscriptionEnd ?? "",
      cards: d.cards ?? []
    } as User;
  }

  async add(user: Omit<User, 'id'>): Promise<User> {
    const docRef = doc(collection(this.firestore, 'users'));
    const payload = {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      signupDate: user.signupDate ?? new Date().toISOString().slice(0, 10),
      avatarUrl: user.avatarUrl ?? '',
      status: user.status ?? "Attivo",
      birthDate: user.birthDate ?? "",
      gender: user.gender ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
      cap: user.cap ?? "",
      personalNotes: user.personalNotes ?? "",
      subscriptionEnd: user.subscriptionEnd ?? "",
      cards: user.cards ?? []
    };
    if (!this.firestore) {
      throw new Error('Firestore not available - add user');
    }
    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload };
  }
}