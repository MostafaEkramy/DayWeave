import { EnergyLevel } from './activity';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultWakeTime: string;  // "07:00"
  defaultSleepTime: string; // "22:00"
  defaultEnergyLevel: EnergyLevel;
  breakDurationMinutes: number; // default 15
  enableSounds: boolean;
  soundVolume: number; // 0 to 1
  autoDetectConflicts: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

/**
 * Extended profile data stored per-user in Firestore & localStorage.
 * This is separate from Firebase Auth's profile (displayName / photoURL).
 */
export interface UserProfileData {
  displayName: string;
  photoURL: string;   // base64 data-URL or external URL
  bio: string;
  goal: string;
  updatedAt: string;
}
