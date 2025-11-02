// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
import { getFirestore } from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries
import { getStorage } from 'firebase/storage'; // 👈 Agregar esta importación

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcYds_G6uTHfIk7PGZDA-vn9RGit4sS5Q",
  authDomain: "furgotruck-2a8e7.firebaseapp.com",
  projectId: "furgotruck-2a8e7",
  storageBucket: "furgotruck-2a8e7.appspot.com",
  messagingSenderId: "112283465575",
  appId: "1:112283465575:web:288e45272bf93dcf6de1c2",
  measurementId: "G-WRWTSEH9ZW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Initialize Firebase Storage 👈 Agregar esto
export const storage = getStorage(app);

export { db };
