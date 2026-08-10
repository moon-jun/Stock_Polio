import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBX-WZo7pnLRI43RnZYptW60FXY3ayB0kc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'planning-with-ai-a3485.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'planning-with-ai-a3485',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:303429363708:web:b2df55578c0cf0e3de7479',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
