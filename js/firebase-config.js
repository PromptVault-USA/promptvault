import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGB5seZrnWVXv--Yr_z1lPOOk1kO5CLFU",
  authDomain: "promptvaultusa.firebaseapp.com",
  projectId: "promptvaultusa",
  storageBucket: "promptvaultusa.firebasestorage.app",
  messagingSenderId: "960105895017",
  appId: "1:960105895017:web:1aa79742d36960d2bfbef8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
