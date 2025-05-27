// main.js - Module style for Firebase 9 modular imports

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  update,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyBD4bDQgVtMd9cwq9Hfdz54NYSBcQvPr1Y",
  authDomain: "thunderboundthunderchat.firebaseapp.com",
  databaseURL:
    "https://thunderboundthunderchat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thunderboundthunderchat",
  storageBucket: "thunderboundthunderchat.appspot.com",
  messagingSenderId: "79690962383",
  appId: "1:79690962383:web:fecf12881a13a4fdf22eba",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const authSection = document.getElementById("auth-section");
const groupSection = document.getElementById("group-section");
const chatSection = document.getElementById("chat-section");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const authMessage = document.getElementById("auth-message");

const groupNameInput = document.getElementById("group-name");
const joinGroupBtn = document.getElementById("join-group-btn");
const logoutBtn = document.getElementById("logout-btn");

const groupTitle = document.getElementById("group-title");
const leaveGroupBtn = document.getElementById("leave-group-btn");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let currentGroup = "";
let messagesRef = null;
let messagesListener = null;
let groupLastActiveRef = null;

// Auth handlers
loginBtn.onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    authMessage.textContent = "Please enter email and password.";
    return;
  }
  authMessage.textContent = "Logging in...";
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      authMessage.textContent = "";
      emailInput.value = "";
      passwordInput.value = "";
    })
    .catch((error) => {
      authMessage.textContent = "Login failed: " + error.message;
    });
};

registerBtn.onclick = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    authMessage.textContent = "Please enter email and password.";
    return;
  }
  if (password.length < 6) {
    authMessage.textContent = "Password should be at least 6 characters.";
    return;
  }
  authMessage.textContent = "Registering...";
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      authMessage.textContent = "Registered successfully, logging in...";
      emailInput.value = "";
      passwordInput.value = "";
    })
    .catch((error) => {
      authMessage.textContent = "Registration failed: " + error.message;
    });
};

logoutBtn.onclick = () => {
  signOut(auth);
  resetApp();
};

// On Auth State Changed
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User logged in
    showSection("group");
  } else {
    // User logged out
    resetApp();
    showSection("auth");
  }
});

function showSection(section) {
  authSection.classList.add("hidden");
  groupSection.classList.add("hidden");
  chatSection.classList.add("hidden");
  if (section === "auth") authSection.classList.remove("hidden");
  else if (section === "group") groupSection.classList.remove("hidden");
  else if (section === "chat") chatSection.classList.remove("hidden");
}

// Join Group
joinGroupBtn.onclick = () => {
  const group = groupNameInput.value.trim();
  if (!group) {
    alert("Please enter a group name.");
    return;
  }
  currentGroup = group;
  groupTitle.textContent = group;
  groupNameInput.value = "";
  showSection("chat");
  startChatListener();
  updateGroupLastActive();
};

// Leave Group
leaveGroupBtn.onclick = () => {
  stopChatListener();
  currentGroup = "";
  messagesDiv.innerHTML = "";
  showSection("group");
};

// Send message
messageForm.onsubmit = (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentGroup) return;
  sendMessage(text);
  messageInput.value = "";
};

function startChatListener() {
  if (!currentGroup) return;

  messagesDiv.innerHTML = "";
  messagesRef = ref(db, `groups/${currentGroup}/messages`);
  groupLastActiveRef = ref(db, `groups/${currentGroup}`);

  if (messagesListener) {
    messagesListener();
  }

  messagesListener = onChildAdded(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    addMessageToDOM(msg);
  });
}

function stopChatListener() {
  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }
}

function addMessageToDOM(msg) {
  const div = document.createElement("div");
  div.classList.add("message");

  // Show timestamp (HH:mm)
  const date = new Date(msg.time);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  div.textContent = `[${timeStr}] ${msg.sender}: ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage(text) {
  const user = auth.currentUser;
  if (!user) return;

  const msgObj = {
    text,
    sender: user.email.split("@")[0], // display part of email before '@'
    time: Date.now(),
  };

  const newMsgRef = push(messagesRef);
  newMsgRef.set(msgObj);

  updateGroupLastActive();
}

function updateGroupLastActive() {
  if (!currentGroup) return;
  const groupRef = ref(db, `groups/${currentGroup}`);
  update(groupRef, { lastActive: Date.now() });
}

// Periodic cleanup of inactive groups (runs every hour, client-side only)
setInterval(async () => {
  const groupsRef = ref(db, "groups");
  const snapshot = await new Promise((resolve) => onValue(groupsRef, resolve, { onlyOnce: true }));
  if (!snapshot.exists()) return;

  const groups = snapshot.val();
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  for (const [groupKey, groupData] of Object.entries(groups)) {
    if (groupData.lastActive && now - groupData.lastActive > oneWeek) {
      // Delete inactive group
      await remove(ref(db, `groups/${groupKey}`));
      console.log(`Deleted inactive group: ${groupKey}`);
    }
  }
}, 3600000); // every hour

function resetApp() {
  stopChatListener();
  currentGroup = "";
  messagesDiv.innerHTML = "";
  groupNameInput.value = "";
  authMessage.textContent = "";
}
