// Import Firebase from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBU2zSeAsRdIOXFQNLz5AqFCgggFcPsoSw",
  authDomain: "thuchat-f5649.firebaseapp.com",
  databaseURL: "https://thuchat-f5649-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thuchat-f5649",
  storageBucket: "thuchat-f5649.appspot.com",
  messagingSenderId: "191671896471",
  appId: "1:191671896471:web:bd3b3075440e3ac41cdcd2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Generate user name like User0, User1, etc.
let userName = "User" + Math.floor(Math.random() * 10000);

// Send message
document.getElementById("sendBtn").onclick = () => {
  const msg = document.getElementById("msgInput").value;
  if (msg.trim() !== "") {
    push(ref(db, "messages"), {
      user: userName,
      text: msg,
      time: Date.now()
    });
    document.getElementById("msgInput").value = "";
  }
};

// Show messages live
const chat = document.getElementById("chat");
onChildAdded(ref(db, "messages"), (snapshot) => {
  const data = snapshot.val();
  const line = document.createElement("div");
  line.innerHTML = `<strong>${data.user}:</strong> ${data.text}`;
  chat.appendChild(line);
  chat.scrollTop = chat.scrollHeight;
});
