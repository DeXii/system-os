import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from './config';

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
