import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  signInWithPopup,
  deleteUser,
  googleProvider,
  FirebaseUser
} from '../services/firebase';
import { UserProfileData } from '../types/user';
import { storageService } from '../services/storageService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  isGuest: boolean;
  userProfile: UserProfileData | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updatePhotoURL: (url: string) => Promise<void>;
  saveUserProfile: (profile: Partial<UserProfileData>) => void;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    if (!auth) {
      setIsGuest(true);
      storageService.setActiveUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsGuest(user ? user.isAnonymous : true);
      setLoading(false);

      if (user && !user.isAnonymous) {
        // ─── Switch storage scope to this user ───
        storageService.setActiveUser(user.uid);

        // Load this user's profile from their scoped localStorage
        const saved = storageService.getProfile();
        if (saved) {
          setUserProfile(saved);
        } else {
          // Seed from Firebase Auth profile
          const initial: UserProfileData = {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            bio: '',
            goal: '',
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(initial);
          storageService.saveProfile(initial, user.uid);
        }
      } else {
        // Guest or signed out — clear scoped user
        storageService.setActiveUser(null);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth is not available.");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    if (!auth) throw new Error("Firebase Auth is not available.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      setCurrentUser({ ...userCredential.user, displayName: name });

      // Scope storage to the new user
      storageService.setActiveUser(userCredential.user.uid);

      // Create initial profile
      const initial: UserProfileData = {
        displayName: name,
        photoURL: '',
        bio: '',
        goal: '',
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(initial);
      storageService.saveProfile(initial, userCredential.user.uid);
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not available.");
    await signInWithPopup(auth, googleProvider);
  };

  const loginAsGuest = async () => {
    if (auth) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Guest sign-in fallback:", err);
      }
    }
    storageService.setActiveUser(null);
    setIsGuest(true);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    // Clear active user scope so guest gets base keys
    storageService.setActiveUser(null);
    setCurrentUser(null);
    setIsGuest(true);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Firebase Auth is not available.");
    await sendPasswordResetEmail(auth, email);
  };

  const updateName = async (name: string) => {
    if (auth && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      setCurrentUser({ ...auth.currentUser, displayName: name });
    }
  };

  const updatePhotoURL = async (url: string) => {
    if (auth && auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: url });
      setCurrentUser({ ...auth.currentUser, photoURL: url });
    }
  };

  const saveUserProfile = (updates: Partial<UserProfileData>) => {
    const current = userProfile || {
      displayName: currentUser?.displayName || '',
      photoURL: currentUser?.photoURL || '',
      bio: '',
      goal: '',
      updatedAt: new Date().toISOString(),
    };

    const updated: UserProfileData = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setUserProfile(updated);
    storageService.saveProfile(updated, currentUser?.uid || null);

    // Also sync displayName to Firebase Auth if changed
    if (updates.displayName && auth?.currentUser) {
      updateProfile(auth.currentUser, { displayName: updates.displayName }).catch(console.warn);
    }
  };

  const deleteAccount = async () => {
    const uid = currentUser?.uid;
    if (uid) {
      // 1. Delete all Firestore documents and user localStorage
      await storageService.deleteAllUserData(uid);
    }
    // 2. Delete Firebase Auth user
    if (auth && auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
    // 3. Clear session and state
    storageService.setActiveUser(null);
    setCurrentUser(null);
    setIsGuest(true);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      isGuest,
      userProfile,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogle,
      loginAsGuest,
      logout,
      resetPassword,
      updateName,
      updatePhotoURL,
      saveUserProfile,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
