// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config from the Firebase console
const firebaseConfig = {
    apiKey: "AIzaSyAWqM5WpDuJK6dhOS1P6NpNY8mN9WyXghY",
    authDomain: "dstyle-2025.firebaseapp.com",
    projectId: "dstyle-2025",
    storageBucket: "dstyle-2025.firebasestorage.app",
    messagingSenderId: "887894365092",
    appId: "1:887894365092:web:0584fe31036280ee19a731",
    measurementId: "G-3JWDZP7NQ7"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
