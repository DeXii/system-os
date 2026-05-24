import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
}

export function getFirebaseConfigError(): string | null {
  if (isFirebaseConfigured()) return null;
  const missing: string[] = [];
  if (!import.meta.env.VITE_FIREBASE_API_KEY) missing.push('VITE_FIREBASE_API_KEY');
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!import.meta.env.VITE_FIREBASE_APP_ID) missing.push('VITE_FIREBASE_APP_ID');
  return `Не заданы переменные: ${missing.join(', ')}. См. docs/DEPLOY.md`;
}

export function getFirebaseApp(): FirebaseApp {
  const err = getFirebaseConfigError();
  if (err) throw new Error(err);
  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}
