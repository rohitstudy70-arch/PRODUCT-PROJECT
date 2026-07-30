import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAux2ojeisci0VWVtUAvQWuftE3GeM1Z28",
  authDomain: "arshi-enterprise.firebaseapp.com",
  projectId: "arshi-enterprise",
  storageBucket: "arshi-enterprise.firebasestorage.app",
  messagingSenderId: "666379585333",
  appId: "1:666379585333:web:4ce22a5baf11481b7c2e7c",
  measurementId: "G-SXN64KPPRN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult };
