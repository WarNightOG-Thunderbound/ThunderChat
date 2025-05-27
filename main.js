import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBD4bDQgVtMd9cwq9Hfdz54NYSBcQvPr1Y",
  authDomain: "thunderboundthunderchat.firebaseapp.com",
  databaseURL: "https://thunderboundthunderchat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thunderboundthunderchat",
  storageBucket: "thunderboundthunderchat.appspot.com",
  messagingSenderId: "79690962383",
  appId: "1:79690962383:web:fecf12881a13a4fdf22eba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// UI elements
const email = document.getElementById("email");
const password = document.getElementById("password");
const captchaQuestion = document.getElementById("captcha-question");
const captchaAnswer = document.getElementById("captcha-answer");

const authDiv = document.getElementById("auth");
const groupSelect = document.getElementById("group-selection");
const createForm = document.getElementById("create-group-form");
const joinForm = document.getElementById("join-group-form");
const chatDiv = document.getElementById("chat");
const groupPassword = document.getElementById("groupPassword");
const messages = document.getElementById("messages");

// CAPTCHA
let captchaResult;
function generateCaptcha() {
  const a = Math.floor(Math.random() * 10);
  const b = Math.floor(Math.random() * 10);
  captchaResult = a + b;
  captchaQuestion.innerText = `${a} + ${b}`;
}
generateCaptcha();

// Register
document.getElementById("register").onclick = async () => {
  if (parseInt(captchaAnswer.value) !== captchaResult) {
    alert("Wrong CAPTCHA!");
    return;
  }
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    await set(ref(db, "users/" + userCred.user.uid), {
      email: email.value,
      createdAt: new Date().toISOString()
    });
    alert("Registered!");
  } catch (err) {
    alert(err.message);
  }
};

// Login
document.getElementById("login").onclick = async () => {
  if (parseInt(captchaAnswer.value) !== captchaResult) {
    alert("Wrong CAPTCHA!");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    showGroupSelection();
  } catch (err) {
    alert(err.message);
  }
};

function showGroupSelection() {
  authDiv.classList.add("hidden");
  groupSelect.classList.remove("hidden");
}

document.getElementById("createGroupBtn").onclick = () => {
  groupSelect.classList.add("hidden");
  createForm.classList.remove("hidden");
};

document.getElementById("joinGroupBtn").onclick = () => {
  groupSelect.classList.add("hidden");
  joinForm.classList.remove("hidden");
};

// Create Group
document.getElementById("submitCreateGroup").onclick = async () => {
  const name = document.getElementById("groupName").value;
  const groupRef = push(ref(db, "groups"));
  const password = Math.random().toString(36).slice(-6);
  await set(groupRef, {
    name,
    password,
    createdAt: Date.now()
  });
  groupPassword.textContent = password;
  showChat();
};

// Join Group
document.getElementById("submitJoinGroup").onclick = async () => {
  const enteredPassword = document.getElementById("joinGroupId").value;
  // You would search through DB to match group password (not efficient for large scale)
  // Skipping for demo purposes
  groupPassword.textContent = enteredPassword;
  showChat();
};

function showChat() {
  createForm.classList.add("hidden");
  joinForm.classList.add("hidden");
  chatDiv.classList.remove("hidden");
}

document.getElementById("logout").onclick = async () => {
  await signOut(auth);
  window.location.reload();
};
