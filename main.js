// Import Firebase functions
import { getDatabase, ref, query, orderByChild, startAt, onChildAdded, push, serverTimestamp } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// Initialize Firebase app in your firebase.js and import it here if needed
// Assuming firebase app already initialized and imported as 'app'

const db = getDatabase();
const auth = getAuth();

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const chatContainer = document.getElementById('chatContainer');
const messageList = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');

let joinTime = Date.now();  // Timestamp when user joins (page loads or connects)

// Listen for auth state changes
onAuthStateChanged(auth, user => {
  if (user) {
    // User logged in
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    chatContainer.style.display = 'block';

    joinTime = Date.now(); // Reset join time on login

    startListeningForMessages();
  } else {
    // User logged out
    loginForm.style.display = 'block';
    registerForm.style.display = 'block';
    chatContainer.style.display = 'none';

    clearMessages();
  }
});

// Register new user
registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = registerForm.email.value;
  const password = registerForm.password.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      registerForm.reset();
    })
    .catch(error => alert(error.message));
});

// Login existing user
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      loginForm.reset();
    })
    .catch(error => alert(error.message));
});

// Logout user
logoutBtn.addEventListener('click', () => {
  signOut(auth);
  clearMessages();
});

// Send new message
sendBtn.addEventListener('click', () => {
  sendMessage();
});

messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const messageText = messageInput.value.trim();
  const user = auth.currentUser;
  if (messageText === '' || !user) return;

  const messagesRef = ref(db, 'messages');
  push(messagesRef, {
    uid: user.uid,
    email: user.email,
    text: messageText,
    timestamp: serverTimestamp()
  });
  messageInput.value = '';
}

// Clear message list UI
function clearMessages() {
  messageList.innerHTML = '';
}

// Listen only for messages sent after user joined (joinTime)
function startListeningForMessages() {
  clearMessages();

  const messagesRef = ref(db, 'messages');
  // Query messages ordered by timestamp starting from joinTime
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), startAt(joinTime));

  onChildAdded(messagesQuery, snapshot => {
    const message = snapshot.val();
    if (!message) return;

    const messageElement = document.createElement('li');
    messageElement.textContent = `${message.email}: ${message.text}`;
    messageList.appendChild(messageElement);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to bottom
  });
}
