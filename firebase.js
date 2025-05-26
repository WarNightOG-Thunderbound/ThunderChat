// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBD4bDQgVtMd9cwq9Hfdz54NYSBcQvPr1Y",
  authDomain: "thunderboundthunderchat.firebaseapp.com",
  databaseURL: "https://thunderboundthunderchat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thunderboundthunderchat",
  storageBucket: "thunderboundthunderchat.firebasestorage.app",
  messagingSenderId: "79690962383",
  appId: "1:79690962383:web:fecf12881a13a4fdf22eba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
