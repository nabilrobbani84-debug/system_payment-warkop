import type { FirebaseOptions } from 'firebase/app';
import rawFirebaseConfig from '../../firebase_config.json';

type FirebaseConfigFile = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const firebaseConfigFile = rawFirebaseConfig as FirebaseConfigFile;

export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: firebaseConfigFile.apiKey || '',
  authDomain: firebaseConfigFile.authDomain || '',
  projectId: firebaseConfigFile.projectId || '',
  storageBucket: firebaseConfigFile.storageBucket || '',
  messagingSenderId: firebaseConfigFile.messagingSenderId || '',
  appId: firebaseConfigFile.appId || '',
  measurementId: firebaseConfigFile.measurementId || undefined,
};

export const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId || '';

export const hasFirebaseConfig = () =>
  Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.storageBucket &&
    FIREBASE_CONFIG.messagingSenderId &&
    FIREBASE_CONFIG.appId
  );
