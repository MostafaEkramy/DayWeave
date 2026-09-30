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
  FirebaseUser, 
  isFirebaseConfigured 
} from '../services/firebase';
import { UserProfileData } from '../types/user';
import { storageService } from '../services/storageService';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

interface LocalAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  createdAt: string;
}

const LOCAL_USERS_KEY = 'pmd_local_users_v1';
const LOCAL_SESSION_KEY = 'pmd_auth_session_v1';

const getLocalUsers = (): Record<string, LocalAccount> => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalUserRecord = (account: LocalAccount) => {
  try {
    const users = getLocalUsers();
    users[account.email.toLowerCase()] = account;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save local user account:', e);
  }
};

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  isFirebaseAvailable: boolean;
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
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    // 1. Check if a local session was saved from previous registration or login
    try {
      const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as AppUser;
        if (parsed && parsed.uid) {
          setCurrentUser(parsed);
          setIsGuest(false);
          storageService.setActiveUser(parsed.uid);

          const savedProfile = storageService.getProfile();
          if (savedProfile) {
            setUserProfile(savedProfile);
          } else {
            const initial: UserProfileData = {
              displayName: parsed.displayName || '',
              photoURL: parsed.photoURL || '',
              bio: '',
              goal: '',
              updatedAt: new Date().toISOString(),
            };
            setUserProfile(initial);
            storageService.saveProfile(initial, parsed.uid);
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading saved local session:', e);
    }

    // 2. Load general local profile if exists
    const saved = storageService.getProfile();
    if (saved) {
      setUserProfile(saved);
    }

    // 3. If Firebase is not configured, remain as guest
    if (!auth || !isFirebaseConfigured) {
      setIsGuest(true);
      storageService.setActiveUser(null);
      setLoading(false);
      return;
    }

    // 4. Firebase onAuthStateChanged listener (when Firebase is configured)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        const appUser: AppUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAnonymous: false,
        };
        setCurrentUser(appUser);
        setIsGuest(false);
        storageService.setActiveUser(user.uid);

        const profile = storageService.getProfile();
        if (profile) {
          setUserProfile(profile);
        } else {
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
        const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
        if (!savedSession) {
          setCurrentUser(null);
          setIsGuest(true);
          storageService.setActiveUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const err: any = new Error('Invalid email address.');
      err.code = 'auth/invalid-email';
      throw err;
    }

    if (pass.length < 6) {
      const err: any = new Error('Password should be at least 6 characters.');
      err.code = 'auth/weak-password';
      throw err;
    }

    // Try Firebase if configured
    if (auth && isFirebaseConfigured) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        if (userCredential.user) {
          await updateProfile(userCredential.user, { displayName: cleanName });
          const userObj: AppUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: cleanName,
            photoURL: '',
            isAnonymous: false,
          };
          setCurrentUser(userObj);
          setIsGuest(false);
          storageService.setActiveUser(userCredential.user.uid);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userObj));

          const initial: UserProfileData = {
            displayName: cleanName,
            photoURL: '',
            bio: '',
            goal: '',
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(initial);
          storageService.saveProfile(initial, userCredential.user.uid);
          return;
        }
      } catch (firebaseErr: any) {
        if (firebaseErr?.code === 'auth/email-already-in-use') {
          throw firebaseErr;
        }
        console.warn('Firebase signup unavailable, falling back to local account:', firebaseErr);
      }
    }

    // Local Account Registration (works 100% offline & without Firebase keys)
    const localUsers = getLocalUsers();
    if (localUsers[cleanEmail]) {
      const err: any = new Error('This email is already in use.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const newAccount: LocalAccount = {
      uid,
      email: cleanEmail,
      password: pass,
      displayName: cleanName,
      createdAt: new Date().toISOString(),
    };
    saveLocalUserRecord(newAccount);

    const userObj: AppUser = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: '',
      isAnonymous: false,
    };

    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userObj));
    storageService.setActiveUser(uid);
    setCurrentUser(userObj);
    setIsGuest(false);

    const initial: UserProfileData = {
      displayName: cleanName,
      photoURL: '',
      bio: '',
      goal: '',
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(initial);
    storageService.saveProfile(initial, uid);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Firebase if configured
    if (auth && isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        if (userCredential.user) {
          const userObj: AppUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || cleanEmail.split('@')[0],
            photoURL: userCredential.user.photoURL || '',
            isAnonymous: false,
          };
          setCurrentUser(userObj);
          setIsGuest(false);
          storageService.setActiveUser(userCredential.user.uid);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userObj));

          const saved = storageService.getProfile();
          if (saved) {
            setUserProfile(saved);
          } else {
            const initial: UserProfileData = {
              displayName: userObj.displayName || '',
              photoURL: userObj.photoURL || '',
              bio: '',
              goal: '',
              updatedAt: new Date().toISOString(),
            };
            setUserProfile(initial);
            storageService.saveProfile(initial, userCredential.user.uid);
          }
          return;
        }
      } catch (firebaseErr: any) {
        if (firebaseErr?.code === 'auth/wrong-password') {
          throw firebaseErr;
        }
        console.warn('Firebase login unavailable, checking local accounts:', firebaseErr);
      }
    }

    // 2. Check Local Accounts
    const localUsers = getLocalUsers();
    const account = localUsers[cleanEmail];
    if (account) {
      if (account.password !== pass) {
        const err: any = new Error('Invalid email or password.');
        err.code = 'auth/wrong-password';
        throw err;
      }

      const userObj: AppUser = {
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        photoURL: '',
        isAnonymous: false,
      };

      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userObj));
      storageService.setActiveUser(account.uid);
      setCurrentUser(userObj);
      setIsGuest(false);

      const saved = storageService.getProfile();
      if (saved) {
        setUserProfile(saved);
      } else {
        const initial: UserProfileData = {
          displayName: account.displayName,
          photoURL: '',
          bio: '',
          goal: '',
          updatedAt: new Date().toISOString(),
        };
        setUserProfile(initial);
        storageService.saveProfile(initial, account.uid);
      }
      return;
    }

    const err: any = new Error('Invalid email or password.');
    err.code = 'auth/invalid-credential';
    throw err;
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not available.");
    await signInWithPopup(auth, googleProvider);
  };

  const loginAsGuest = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Guest sign-in fallback:", err);
      }
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    storageService.setActiveUser(null);
    setCurrentUser(null);
    setIsGuest(true);
  };

  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try { await signOut(auth); } catch {}
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    storageService.setActiveUser(null);
    setCurrentUser(null);
    setIsGuest(true);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (auth && isFirebaseConfigured) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return;
      } catch {}
    }
    const localUsers = getLocalUsers();
    if (!localUsers[cleanEmail]) {
      const err: any = new Error('User not found.');
      err.code = 'auth/user-not-found';
      throw err;
    }
  };

  const updateName = async (name: string) => {
    saveUserProfile({ displayName: name });
  };

  const updatePhotoURL = async (url: string) => {
    saveUserProfile({ photoURL: url });
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

    if (updates.displayName && currentUser) {
      setCurrentUser(prev => prev ? { ...prev, displayName: updates.displayName! } : null);
      try {
        const raw = localStorage.getItem(LOCAL_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.displayName = updates.displayName;
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
        }
        const users = getLocalUsers();
        if (currentUser.email && users[currentUser.email.toLowerCase()]) {
          users[currentUser.email.toLowerCase()].displayName = updates.displayName!;
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        }
      } catch {}
    }

    if (updates.displayName && auth?.currentUser) {
      updateProfile(auth.currentUser, { displayName: updates.displayName }).catch(console.warn);
    }
  };

  const deleteAccount = async () => {
    const uid = currentUser?.uid;
    const email = currentUser?.email;

    if (uid) {
      await storageService.deleteAllUserData(uid);
    }

    if (email) {
      const users = getLocalUsers();
      delete users[email.toLowerCase()];
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    }

    if (auth && auth.currentUser) {
      try { await deleteUser(auth.currentUser); } catch {}
    }

    localStorage.removeItem(LOCAL_SESSION_KEY);
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
      isFirebaseAvailable: isFirebaseConfigured,
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
