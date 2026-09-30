import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

// Firebase configuration — must be supplied via environment variables (never hardcode secrets).
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

const hasRequiredFirebaseEnv = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;
let isFirebaseConfigured = false;

try {
  if (!hasRequiredFirebaseEnv) {
    console.warn(
      'Firebase env vars missing (VITE_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID). Running in local-only mode.'
    );
    isFirebaseConfigured = false;
  } else if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;
  }

  if (isFirebaseConfigured) {

    // Initialize Analytics conditionally where supported in browser
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {
        // Analytics not supported in this environment
      });
    }
  }
} catch (err) {
  console.warn("Firebase initialization warning (falling back gracefully):", err);
  isFirebaseConfigured = false;
  // Fallbacks to avoid crashing
  app = (getApps().length ? getApps()[0] : ({} as any));
  auth = ({} as any);
  db = ({} as any);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  app, 
  auth, 
  db, 
  analytics,
  googleProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  signInWithPopup,
  deleteUser,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
  enableNetwork,
  disableNetwork
};

export type { FirebaseUser };
