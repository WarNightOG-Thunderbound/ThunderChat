// main.js
import { auth, database } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  ref, push, onChildAdded
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// UI Elements
const email = document.getElementById('email');
const password = document.getElementById('password');
const register = document.getElementById('register');
const login = document.getElementById('login');
const logout = document.getElementById('logout');
const messageInput = document.getElementById('messageInput');
const send = document.getElementById('send');
const messages = document.getElementById('messages');
const authBox = document.getElementById('auth');
const chatBox = document.getElementById('chat');

// Register
register.onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Registered"))
    .catch(e => alert(e.message));
};

// Login
login.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert("Logged in"))
    .catch(e => alert(e.message));
};

// Logout
logout.onclick = () => {
  signOut(auth);
};

// Auth State
onAuthStateChanged(auth, user => {
  if (user) {
    authBox.style.display = 'none';
    chatBox.style.display = 'block';
    startChat();
  } else {
    authBox.style.display = 'block';
    chatBox.style.display = 'none';
    messages.innerHTML = '';
  }
});

// Send Message
send.onclick = () => {
  if (messageInput.value.trim() === '') return;
  const chatRef = ref(database, 'chats/');
  push(chatRef, {
    name: auth.currentUser.email,
    text: messageInput.value
  });
  messageInput.value = '';
};

// Real-time Chat Listener
function startChat() {
  const chatRef = ref(database, 'chats/');
  onChildAdded(chatRef, snapshot => {
    const msg = snapshot.val();
    const div = document.createElement('div');
    div.textContent = `[${msg.name}]: ${msg.text}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });
}
