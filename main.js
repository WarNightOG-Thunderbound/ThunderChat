import { getDatabase, ref, query, orderByChild, startAt, onChildAdded, push, set, serverTimestamp } from "firebase/database";
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    chatContainer.style.display = 'block';

    serverJoinTime = await getAccurateServerTime();
    startListeningForMessages(serverJoinTime);
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

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  const user = auth.currentUser;
  if (!text || !user) return;

  push(ref(db, 'messages'), {
    uid: user.uid,
    email: user.email,
    text: text,
    timestamp: Date.now() // always send local timestamp
  });

  messageInput.value = '';
}

function clearMessages() {
  messageList.innerHTML = '';
}

// ✅ Better & fast way to get Firebase server time
async function getAccurateServerTime() {
  const tempRef = push(ref(db, 'timestamps'));
  await set(tempRef, { createdAt: serverTimestamp() });

  const snap = await new Promise(resolve =>
    onChildAdded(ref(db, 'timestamps'), snapshot => resolve(snapshot))
  );

  return snap.val().createdAt || Date.now();
}

function startListeningForMessages(time) {
  const q = query(ref(db, 'messages'), orderByChild('timestamp'), startAt(time));
  onChildAdded(q, snap => {
    const msg = snap.val();
    if (!msg) return;

    const li = document.createElement('li');
    li.textContent = `${msg.email}: ${msg.text}`;
    messageList.appendChild(li);
    messageList.scrollTop = messageList.scrollHeight;
  });
}
