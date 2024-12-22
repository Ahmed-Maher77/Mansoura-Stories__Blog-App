import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBAxmVAVkdcHIFvIRxEDt9veXevAxBJfuo",
    authDomain: "mansoura-stories---blog-app.firebaseapp.com",
    projectId: "mansoura-stories---blog-app",
    storageBucket: "mansoura-stories---blog-app.firebasestorage.app",
    messagingSenderId: "703579694140",
    appId: "1:703579694140:web:14442cf0da761de3044f39"
};
const app = initializeApp(firebaseConfig);

"================================================================================"
// Firestore Database:
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const db = getFirestore();                  // initialize Firestore
export const colRef = collection(db, "posts");     // collection reference (db, collection_name)


"================================================================================"
// Authentication:
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();  // login by google account


