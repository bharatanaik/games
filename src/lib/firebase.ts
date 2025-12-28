// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2byMNA9fi6ic3DwVdWjDxhWULGPNZDE8",
  authDomain: "game-b6c68.firebaseapp.com",
  projectId: "game-b6c68",
  storageBucket: "game-b6c68.firebasestorage.app",
  messagingSenderId: "324433243092",
  appId: "1:324433243092:web:5bab7d7e2aa42490540441"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const rtdb = getDatabase(app)