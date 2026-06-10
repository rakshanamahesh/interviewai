import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClYLnEboRF_0wQSg4YnlHeRay-ODf4mm4",
  authDomain: "interviewai-17d6f.firebaseapp.com",
  projectId: "interviewai-17d6f",
  storageBucket: "interviewai-17d6f.firebasestorage.app",
  messagingSenderId: "947427042809",
  appId: "1:947427042809:web:02abd329b0ae85e00e8928"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);