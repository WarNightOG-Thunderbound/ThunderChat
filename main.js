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
// ====== NEW CALLING SYSTEM CODE ======

// DOM Elements for Call UI
const startVoiceCallBtn = document.getElementById('start-voice-call-btn');
const startVideoCallBtn = document.getElementById('start-video-call-btn');
const callScreen = document.getElementById('call-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callStatus = document.getElementById('call-status');
const remoteUserDisplay = document.getElementById('remote-user-display');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const hangupBtn = document.getElementById('hangup-btn');

// WebRTC Global Variables
let peerConnection = null;
let localStream = null;
let currentCallId = null; // ID of the active call in Firebase
let callType = null; // 'voice' or 'video'
let callRef = null; // Firebase reference to the current call
let callEndedListener = null; // Listener for call ending
let isMicMuted = false;
let isVideoOff = false;

// WebRTC Configuration (using Google's STUN server for NAT traversal)
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ]
};

// Helper to get local media stream
async function getLocalStream(video = true) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: video,
            audio: true
        });
        localVideo.srcObject = localStream;
        localVideo.style.display = video ? 'block' : 'none'; // Show local video only if video call
        toggleVideoBtn.style.display = video ? 'flex' : 'none'; // Show video toggle only if video call
        toggleMicBtn.classList.remove('off'); // Reset mic button state
        toggleVideoBtn.classList.remove('off'); // Reset video button state
        isMicMuted = false;
        isVideoOff = false;
        console.log("Local stream obtained.");
        return localStream;
    } catch (error) {
        console.error("Error getting user media:", error);
        showAlert("Media Error", "Could not access microphone or camera. Please check permissions.");
        return null;
    }
}

// Helper to stop local media stream
function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
        console.log("Local stream stopped.");
    }
}

// Function to create RTCPeerConnection
function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    peerConnection = new RTCPeerConnection(rtcConfig);
    console.log("RTCPeerConnection created.");

    // Add local stream tracks to peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log(`Added local track: ${track.kind}`);
        });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            if (currentCallId && callRef) {
                push(child(callRef, 'candidates/' + currentUser.uid), event.candidate.toJSON());
            }
        }
    };

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
        console.log("Received remote track:", event.streams[0]);
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.style.display = 'block';
            callStatus.textContent = 'Connected!';
            console.log("Remote stream connected.");
        }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        console.log("Peer connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            showAlert("Call Ended", "The call has been disconnected.");
            hangupCall();
        } else if (peerConnection.connectionState === 'connected') {
            callStatus.textContent = 'Connected!';
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'disconnected') {
            // Consider re-attempting connection or showing warning
        }
    };

    return peerConnection;
}

// Function to start an outgoing call
async function startOutgoingCall(targetUsername, type) {
    if (!currentUser || !currentUser.uid) {
        showAlert("Error", "You must be logged in to make a call.");
        return;
    }

    if (currentCallId) {
        showAlert("Error", "You are already in a call.");
        return;
    }

    showLoading("Initiating call...");
    callType = type;

    try {
        const usersSnapshot = await get(ref(db, 'users'));
        let targetUser = null;
        usersSnapshot.forEach(childSnapshot => {
            if (childSnapshot.val().username.toLowerCase() === targetUsername.toLowerCase()) {
                targetUser = { uid: childSnapshot.key, ...childSnapshot.val() };
            }
        });

        if (!targetUser) {
            hideLoading();
            showAlert("User Not Found", `User "${targetUsername}" does not exist.`);
            return;
        }

        if (targetUser.uid === currentUser.uid) {
            hideLoading();
            showAlert("Self-Call", "You cannot call yourself.");
            return;
        }

        // 1. Get local stream
        if (!await getLocalStream(type === 'video')) {
            hideLoading();
            return; // Failed to get stream
        }

        // 2. Create RTCPeerConnection
        createPeerConnection();

        // 3. Create offer
        const offer = await peerConnection.createOffer({
            offerToReceiveVideo: type === 'video',
            offerToReceiveAudio: true
        });
        await peerConnection.setLocalDescription(offer);
        console.log("Created and set local offer.");

        // 4. Store call info in Firebase
        const newCallRef = push(ref(db, 'calls'), {
            callerId: currentUser.uid,
            callerUsername: currentUser.username,
            calleeId: targetUser.uid,
            calleeUsername: targetUser.username,
            offer: {
                type: offer.type,
                sdp: offer.sdp,
            },
            type: type, // 'voice' or 'video'
            timestamp: Date.now(),
            status: 'ringing'
        });
        currentCallId = newCallRef.key;
        callRef = newCallRef;
        console.log("Call created in Firebase:", currentCallId);

        // Listen for answer
        onValue(callRef, async (snapshot) => {
            const callData = snapshot.val();
            if (!callData) return;

            if (callData.status === 'answered' && callData.answer && peerConnection.remoteDescription?.type !== 'answer') {
                console.log("Received answer:", callData.answer);
                await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
                callStatus.textContent = 'Connecting...';
                hideLoading();
                showSection('call-screen'); // Show call screen
            } else if (callData.status === 'rejected') {
                hideLoading();
                showAlert("Call Rejected", `${callData.calleeUsername} rejected your call.`);
                hangupCall();
            } else if (callData.status === 'no-answer') {
                hideLoading();
                showAlert("No Answer", `${callData.calleeUsername} did not answer.`);
                hangupCall();
            } else if (callData.status === 'ended' && callData.endedBy !== currentUser.uid) {
                 hideLoading();
                 showAlert("Call Ended", `${callData.endedByUsername || 'The other party'} ended the call.`);
                 hangupCall();
            }
        }, { onlyOnce: false }); // Keep listener open for ongoing call status

        // Listen for ICE candidates from remote
        onChildAdded(child(callRef, 'candidates/' + targetUser.uid), (snapshot) => {
            const candidate = new RTCIceCandidate(snapshot.val());
            console.log("Adding remote ICE candidate:", candidate);
            peerConnection.addIceCandidate(candidate);
        });

        // Set call UI
        remoteUserDisplay.textContent = `Calling ${targetUser.username}...`;
        callStatus.textContent = 'Ringing...';

        // Set a timeout for no answer
        setTimeout(async () => {
            const currentCallSnapshot = await get(callRef);
            if (currentCallSnapshot.exists() && currentCallSnapshot.val().status === 'ringing') {
                update(callRef, { status: 'no-answer', endedBy: 'system' });
            }
        }, 30000); // 30 seconds for no answer

        hideLoading();
        showSection('call-screen'); // Show call screen for outgoing call
    } catch (error) {
        console.error("Error starting outgoing call:", error);
        hideLoading();
        showAlert("Call Error", "Failed to start call: " + error.message);
        hangupCall();
    }
}

// Function to listen for incoming calls
function listenForIncomingCalls() {
    if (!currentUser || !currentUser.uid) {
        console.warn("Not logged in, cannot listen for calls.");
        return;
    }

    const callsRef = ref(db, 'calls');
    // Listen for new calls where this user is the callee and status is 'ringing'
    onChildAdded(callsRef, async (snapshot) => {
        const callData = snapshot.val();
        const callId = snapshot.key;

        if (callData.calleeId === currentUser.uid && callData.status === 'ringing') {
            console.log("Incoming call detected:", callData);

            if (currentCallId) {
                // If already in a call or busy, reject new incoming call automatically
                console.log("Already in a call, rejecting new incoming call.");
                update(ref(db, `calls/${callId}`), { status: 'rejected', endedBy: currentUser.uid });
                return;
            }

            currentCallId = callId;
            callRef = ref(db, `calls/${callId}`);
            callType = callData.type;

            // Show incoming call prompt
            const answerCall = await showPrompt(
                "Incoming Call",
                `Incoming ${callData.type} call from ${callData.callerUsername}. Do you want to answer?`,
                false, // No input needed
                "Answer",
                "Reject"
            );

            if (answerCall) {
                showLoading("Answering call...");
                try {
                    // 1. Get local stream
                    if (!await getLocalStream(callType === 'video')) {
                        update(callRef, { status: 'rejected', endedBy: currentUser.uid }); // Reject if stream fails
                        hideLoading();
                        hangupCall();
                        return;
                    }

                    // 2. Create RTCPeerConnection
                    createPeerConnection();

                    // 3. Set remote offer
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
                    console.log("Set remote offer.");

                    // 4. Create answer
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    console.log("Created and set local answer.");

                    // 5. Update call in Firebase with answer and status
                    await update(callRef, {
                        answer: {
                            type: answer.type,
                            sdp: answer.sdp,
                        },
                        status: 'answered'
                    });
                    console.log("Call answered and updated in Firebase.");

                    // Listen for ICE candidates from remote (caller)
                    onChildAdded(child(callRef, 'candidates/' + callData.callerId), (snapshot) => {
                        const candidate = new RTCIceCandidate(snapshot.val());
                        console.log("Adding remote ICE candidate:", candidate);
                        peerConnection.addIceCandidate(candidate);
                    });

                    // Listen for the caller ending the call
                    callEndedListener = onValue(callRef, (snap) => {
                        const updatedCallData = snap.val();
                        if (!updatedCallData || updatedCallData.status === 'ended' || updatedCallData.status === 'no-answer' || updatedCallData.status === 'rejected') {
                            if (updatedCallData && updatedCallData.endedBy !== currentUser.uid) {
                                showAlert("Call Ended", `${updatedCallData.endedByUsername || 'The other party'} ended the call.`);
                            }
                            hangupCall();
                        }
                    }, { onlyOnce: false }); // Keep listener open

                    remoteUserDisplay.textContent = `Connected with ${callData.callerUsername}`;
                    callStatus.textContent = 'Connecting...'; // Will change to 'Connected!' on track event
                    hideLoading();
                    showSection('call-screen');
                } catch (error) {
                    console.error("Error answering call:", error);
                    hideLoading();
                    showAlert("Call Error", "Failed to answer call: " + error.message);
                    update(callRef, { status: 'rejected', endedBy: currentUser.uid });
                    hangupCall();
                }
            } else {
                // User rejected the call
                console.log("Call rejected by user.");
                update(callRef, { status: 'rejected', endedBy: currentUser.uid });
                hangupCall(); // Clean up local state
            }
        }
    });
    console.log("Listening for incoming calls...");
}

// Function to hang up the current call
async function hangupCall() {
    if (callRef && currentCallId) {
        console.log("Hanging up call:", currentCallId);
        await update(callRef, { status: 'ended', endedBy: currentUser.uid, endedByUsername: currentUser.username });
        // Ensure the onValue listener is detached to avoid re-triggering hangup
        if (callEndedListener) {
            off(callRef, 'value', callEndedListener); // Detach the listener
            callEndedListener = null;
        }
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        console.log("PeerConnection closed.");
    }

    stopLocalStream();
    remoteVideo.srcObject = null;
    remoteVideo.style.display = 'none';
    callStatus.textContent = '';
    remoteUserDisplay.textContent = '';
    currentCallId = null;
    callRef = null;
    callType = null;
    isMicMuted = false;
    isVideoOff = false;
    toggleMicBtn.classList.remove('off');
    toggleVideoBtn.classList.remove('off');
    toggleVideoBtn.style.display = 'flex'; // Reset display for video toggle
    showSection('group-section'); // Go back to group options
    console.log("Call cleaned up.");
}

// Function to update call UI (e.g., mute/unmute icons)
function updateCallUI() {
    if (isMicMuted) {
        toggleMicBtn.classList.add('off');
    } else {
        toggleMicBtn.classList.remove('off');
    }

    if (isVideoOff) {
        toggleVideoBtn.classList.add('off');
    } else {
        toggleVideoBtn.classList.remove('off');
    }
}


// Event Listeners for Call Buttons
startVoiceCallBtn.addEventListener('click', async () => {
    const targetUsername = await showPrompt("Start Voice Call", "Enter username to call:");
    if (targetUsername) {
        startOutgoingCall(targetUsername, 'voice');
    }
});

startVideoCallBtn.addEventListener('click', async () => {
    const targetUsername = await showPrompt("Start Video Call", "Enter username to call:");
    if (targetUsername) {
        startOutgoingCall(targetUsername, 'video');
    }
});

toggleMicBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            isMicMuted = !track.enabled;
            updateCallUI();
            console.log(`Mic ${isMicMuted ? 'muted' : 'unmuted'}`);
        });
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (localStream && callType === 'video') { // Only toggle video if it's a video call
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
            isVideoOff = !track.enabled;
            // Hide local video element if video is off
            localVideo.style.opacity = isVideoOff ? '0' : '1';
            updateCallUI();
            console.log(`Video ${isVideoOff ? 'off' : 'on'}`);
        });
    }
});

hangupBtn.addEventListener('click', hangupCall);
// ... (rest of your main.js code above this function) ...

// Render contacts list
function renderContactsList() {
    if (userContacts.length === 0) {
        contactsList.innerHTML = '<div class="no-contacts">You don\'t have any contacts yet</div>';
        return;
    }
    
    contactsList.innerHTML = userContacts.map(contact => `
        <div class="contact-item" data-contact="${contact.id}">
            <div class="contact-avatar">
                ${contact.avatarUrl ? 
                    `<img src="${contact.avatarUrl}" alt="${contact.username}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/00bcd4/ffffff?text=${contact.username?.charAt(0).toUpperCase() || 'U'}'" />` : 
                    `<div>${contact.username?.charAt(0).toUpperCase() || 'U'}</div>`}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username || 'Unknown User'}</div>
                <div class="contact-status">${contact.status || 'No status'}</div>
            </div>
            <!-- NEW CALL BUTTONS -->
            <div class="call-buttons-container">
                <button class="call-btn voice-call-btn" data-target-username="${contact.username}" title="Voice Call">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
                <button class="call-btn video-call-btn" data-target-username="${contact.username}" title="Video Call">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video"><path d="M22 8.5V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5L10 2l12 6.5Z"/><path d="M2 12v3.5A2.5 2.5 0 0 0 4.5 18h15A2.5 2.5 0 0 0 22 15.5V12"/></svg>
                </button>
            </div>
            <!-- END NEW CALL BUTTONS -->
        </div>
    `).join('');

    // Apply styles for fallback avatars (initials)
    document.querySelectorAll('.contact-avatar div').forEach(div => {
        div.style.backgroundColor = 'var(--color-cyan-primary)'; /* Use the primary cyan */
        div.style.color = 'white';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.fontSize = '1.8em'; /* Larger initials */
    });
    
    // Add click event to contacts
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Only enter chat if the click wasn't on a call button
            if (!e.target.closest('.call-btn')) { // Check if click was on any call button
                const contactId = item.getAttribute('data-contact');
                const contact = userContacts.find(c => c.id === contactId);
                if (contact) {
                    enterPrivateChat(contact);
                }
            }
        });
    });

    // Add event listeners for call buttons within contact items
    document.querySelectorAll('.contact-item .voice-call-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent contact-item click from triggering
            const targetUsername = e.currentTarget.getAttribute('data-target-username');
            window.startOutgoingCall(targetUsername, 'voice');
        });
    });

    document.querySelectorAll('.contact-item .video-call-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent contact-item click from triggering
            const targetUsername = e.currentTarget.getAttribute('data-target-username');
            window.startOutgoingCall(targetUsername, 'video');
        });
    });
}

