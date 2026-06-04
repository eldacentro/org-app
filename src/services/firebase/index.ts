import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECTID,
  appId: import.meta.env.VITE_FIREBASE_APPID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGINGSENDERID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGEBUCKET,
};

initializeApp(firebaseConfig);

export const firestore = getFirestore();

if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
  connectAuthEmulator(
    getAuth(),
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST,
    { disableWarnings: true }
  );
}
