import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCM8Q9T-UWkLsdzqwfvsLja28xIAIUlD6s",
  authDomain: "app-personal-c5224.firebaseapp.com",
  projectId: "app-personal-c5224",
  storageBucket: "app-personal-c5224.firebasestorage.app",
  messagingSenderId: "450436905374",
  appId: "1:450436905374:web:cd880bef2ba36b5b0ffe8f",
  measurementId: "G-VMMLS0QKCZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
