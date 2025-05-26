// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔥 Your ThunderChat Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBU2zSeAsRdIOXFQNLz5AqFCgggFcPsoSw",
  authDomain: "thuchat-f5649.firebaseapp.com",
  databaseURL: "https://thuchat-f5649-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thuchat-f5649",
  storageBucket: "thuchat-f5649.appspot.com",
  messagingSenderId: "191671896471",
  appId: "1:191671896471:web:bd3b3075440e3ac41cdcd2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function register() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, pass)
    .then((userCredential) => {
      document.getElementById("message").innerText = "✅ Registered Successfully!";
    })
    .catch((error) => {
      document.getElementById("message").innerText = "❌ " + error.message;
    });
}

function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, pass)
    .then((userCredential) => {
      document.getElementById("message").innerText = "✅ Logged in!";
      // Redirect to chat page here if needed
    })
    .catch((error) => {
      document.getElementById("message").innerText = "❌ " + error.message;
    });
}
