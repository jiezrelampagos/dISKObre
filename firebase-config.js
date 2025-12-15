import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3mU01lZU_6yYqBkGLxYJN38GWwF08eSE",
  authDomain: "lost-and-found-6d79f.firebaseapp.com",
  databaseURL: "https://lost-and-found-6d79f-default-rtdb.firebaseio.com",
  projectId: "lost-and-found-6d79f",
  storageBucket: "lost-and-found-6d79f.firebasestorage.app",
  messagingSenderId: "326485181806",
  appId: "1:326485181806:web:c1760eb4917fa06d1c2d7f",
  measurementId: "G-EYZSSZZDHH"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
