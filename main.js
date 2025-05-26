import { getDatabase, ref, query, orderByChild, startAt, onChildAdded, push, serverTimestamp, set } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const db = getDatabase();
const auth = getAuth();

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const chatContainer = document.getElementById('chatContainer');
const messageList = document.getElementById('messageList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');

let serverJoinTime = null;

onAuthStateChanged(auth, user => {
  if (user) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    chatContainer.style.display = 'block';

    getAccurateServerTime().then((time) => {
      serverJoinTime = time;
      startListeningForMessages(serverJoinTime);
    });
  } else {
    loginForm.style.display = 'block';
    registerForm.style.display = 'block';
    chatContainer.style.display = 'none';
    clearMessages();
  }
});

registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = registerForm.email.value;
  const password = registerForm.password.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => registerForm.reset())
    .catch(error => alert(error.message));
});

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => loginForm.reset())
    .catch(error => alert(error.message));
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
  clearMessages();
});

sendBtn.addEventListener('click', () => sendMessage());
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
    timestamp: Date.now()
  });
  messageInput.value = '';
}

function clearMessages() {
  messageList.innerHTML = '';
}

// ✅ Accurate server time using Firebase
function getAccurateServerTime() {
  return new Promise((resolve) => {
    const timeRef = ref(db, 'serverTime');
    const dummyRef = ref(db, 'temp/' + Math.random().toString(36).substring(2));

    set(dummyRef, { t: serverTimestamp() }).then(() => {
      onChildAdded(ref(db, 'temp'), (snapshot) => {
        const val = snapshot.val();
        if (val.t) {
          resolve(val.t);
        }
      });
    });
  });
}

function startListeningForMessages(startTime) {
  clearMessages();

  const messagesRef = ref(db, 'messages');
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), startAt(startTime));

  onChildAdded(messagesQuery, snapshot => {
    const message = snapshot.val();
    if (!message) return;

    const messageElement = document.createElement('li');
    messageElement.textContent = `${message.email}: ${message.text}`;
    messageList.appendChild(messageElement);
    messageList.scrollTop = messageList.scrollHeight;
  });
}
