// calls.js - Standalone module for Calls functionality

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onChildAdded,
    get,
    child,
    update,
    onValue,
    off // Import off to detach listeners
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Firebase Configuration (from your main.js)
const firebaseConfig = {
    apiKey: "AIzaSyBD4bDQgVtMd9cwq9Hfdz54NYSBcQvPr1Y",
    authDomain: "thunderboundthunderchat.firebaseapp.com",
    databaseURL: "https://thunderboundthunderchat-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thunderboundthunderchat",
    storageBucket: "thunderboundthunderchat.appspot.com",
    messagingSenderId: "79690962383",
    appId: "1:79690962383:web:fecf12881a13a4fdf22eba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const authMessage = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-btn');

const callsContactsSection = document.getElementById('calls-contacts-section');
const contactsListDiv = document.getElementById('contacts-list');

const callScreen = document.getElementById('call-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callStatus = document.getElementById('call-status');
const remoteUserDisplay = document.getElementById('remote-user-display');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const hangupBtn = document.getElementById('hangup-btn');

const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
const closeAlertBtn = document.getElementById('close-alert-btn');

let currentUser = null;
let userContacts = [];
let isRegisterMode = false;

// WebRTC Global Variables
let peerConnection = null;
let localStream = null;
let currentCallId = null; // ID of the active call in Firebase
let callType = null; // 'voice' or 'video'
let callRef = null; // Firebase reference to the current call
let callEndedListener = null; // Listener for call ending
let isMicMuted = false;
let isVideoOff = false;
let incomingCallListener = null; // Listener for incoming calls

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

// --- Utility Functions ---
function showLoading(message = 'Loading...') {
    loadingScreen.querySelector('div:last-child').textContent = message;
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function showAlert(message, duration = 3000) {
    customAlertMessage.textContent = message;
    customAlertModal.classList.add('show-modal');
    customAlertModal.classList.remove('hidden');
    setTimeout(() => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    }, duration);
}

// --- Section Management ---
function showSection(sectionId) {
    const sections = [authSection, callsContactsSection, callScreen];
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}

// --- Auth Functionality ---
toggleAuthModeBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    toggleAuthModeBtn.textContent = isRegisterMode ? 'Already have an account? Login' : 'Don\'t have an account? Register';
    authMessage.textContent = ''; // Clear previous messages
});

authSubmitBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!email || !password) {
        authMessage.textContent = 'Please enter email and password.';
        return;
    }

    showLoading(isRegisterMode ? 'Registering...' : 'Logging in...');
    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Store user data in Realtime Database, including a memorable ID
            const memorableId = generateMemorableId();
            await set(ref(db, `users/${user.uid}`), {
                username: email.split('@')[0], // Default username from email
                email: email,
                status: 'Online',
                avatarUrl: '',
                memorableId: memorableId // Store the memorable ID
            });
            authMessage.textContent = 'Registration successful! Logging in...';
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Login successful!';
        }
        authEmailInput.value = '';
        authPasswordInput.value = '';
    } catch (error) {
        console.error("Auth error:", error);
        authMessage.textContent = `Error: ${error.message}`;
    } finally {
        hideLoading();
    }
});

logoutBtn.addEventListener('click', async () => {
    showLoading('Logging out...');
    try {
        await signOut(auth);
        // onAuthStateChanged will handle UI reset
    } catch (error) {
        console.error("Logout error:", error);
        showAlert(`Logout failed: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// Generate a simple memorable ID (for demo purposes)
function generateMemorableId() {
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    return `${randomNumber}${randomChars}`;
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading('Fetching user data...');
        const snapshot = await get(child(ref(db), `users/${user.uid}`));
        if (snapshot.exists()) {
            currentUser = { uid: user.uid, ...snapshot.val() };
            hideLoading();
            showSection('calls-contacts-section');
            loadUserContacts();
            listenForIncomingCalls(); // Start listening for calls once authenticated
        } else {
            // This might happen if a user registers but their DB entry fails
            hideLoading();
            showAlert('User data not found. Please try again or contact support.');
            signOut(auth); // Force logout
        }
    } else {
        currentUser = null;
        userContacts = [];
        // Detach incoming call listener on logout
        if (incomingCallListener) {
            off(ref(db, 'calls'), 'child_added', incomingCallListener);
            incomingCallListener = null;
        }
        showSection('auth-section');
    }
});

// --- Contacts Functionality ---
async function loadUserContacts() {
    if (!currentUser) return;

    showLoading('Loading contacts...');
    try {
        const snapshot = await get(child(ref(db), `userContacts/${currentUser.uid}`));
        if (snapshot.exists()) {
            const contactsData = snapshot.val();
            const contactIds = Object.keys(contactsData);

            userContacts = [];
            for (const contactId of contactIds) {
                const userSnapshot = await get(child(ref(db), `users/${contactId}`));
                if (userSnapshot.exists()) {
                    userContacts.push({
                        id: contactId,
                        ...userSnapshot.val()
                    });
                }
            }
            renderContactsList();
        } else {
            userContacts = [];
            renderContactsList();
        }
    } catch (error) {
        console.error("Error loading contacts:", error);
        showAlert("Failed to load contacts.");
        userContacts = [];
        renderContactsList();
    } finally {
        hideLoading();
    }
}

function renderContactsList() {
    if (userContacts.length === 0) {
        contactsListDiv.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No contacts found. Add contacts in the main ThunderChat app to see them here.</div>';
        return;
    }

    contactsListDiv.innerHTML = userContacts.map(contact => `
        <div class="contact-item" data-contact-id="${contact.id}">
            <div class="contact-avatar">
                ${contact.avatarUrl ?
                    `<img src="${contact.avatarUrl}" alt="${contact.username}" onerror="this.onerror=null;this.src='https://placehold.co/48x48/007bff/ffffff?text=${contact.username?.charAt(0).toUpperCase() || 'U'}'" />` :
                    `<div>${contact.username?.charAt(0).toUpperCase() || 'U'}</div>`}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username || 'Unknown User'}</div>
            </div>
            <button class="call-icon" data-contact-id="${contact.id}" data-call-type="voice">
                <i class="fas fa-phone"></i>
            </button>
            <button class="call-icon ml-2" data-contact-id="${contact.id}" data-call-type="video">
                <i class="fas fa-video"></i>
            </button>
        </div>
    `).join('');

    // Add event listeners to call buttons
    document.querySelectorAll('.call-icon').forEach(button => {
        button.addEventListener('click', (e) => {
            const contactId = e.currentTarget.getAttribute('data-contact-id');
            const type = e.currentTarget.getAttribute('data-call-type');
            const contact = userContacts.find(c => c.id === contactId);
            if (contact) {
                startOutgoingCall(contact, type);
            }
        });
    });
}

// --- WebRTC Call Functionality ---

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
async function startOutgoingCall(targetContact, type) {
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
            calleeId: targetContact.id,
            calleeUsername: targetContact.username,
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
        callEndedListener = onValue(callRef, async (snapshot) => {
            const callData = snapshot.val();
            if (!callData) return;

            if (callData.status === 'answered' && callData.answer && peerConnection.remoteDescription?.type !== 'answer') {
                console.log("Received answer:", callData.answer);
                await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
                callStatus.textContent = 'Connected!';
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
        onChildAdded(child(callRef, 'candidates/' + targetContact.id), (snapshot) => {
            const candidate = new RTCIceCandidate(snapshot.val());
            console.log("Adding remote ICE candidate:", candidate);
            peerConnection.addIceCandidate(candidate);
        });

        // Set call UI
        remoteUserDisplay.textContent = `Calling ${targetContact.username}...`;
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
    // Detach any existing listener to prevent duplicates
    if (incomingCallListener) {
        off(callsRef, 'child_added', incomingCallListener);
    }

    // Listen for new calls where this user is the callee and status is 'ringing'
    incomingCallListener = onChildAdded(callsRef, async (snapshot) => {
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

            // Show incoming call prompt using custom alert
            const promptMessage = `Incoming ${callData.type} call from ${callData.callerUsername}. Do you want to answer?`;
            
            // Create custom prompt for answer/reject
            const modalContent = customAlertModal.querySelector('.custom-modal-content');
            modalContent.innerHTML = `
                <p class="text-gray-800 dark:text-gray-100 text-lg mb-6">${promptMessage}</p>
                <div class="flex justify-center gap-4">
                    <button id="answer-call-btn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">Answer</button>
                    <button id="reject-call-btn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">Reject</button>
                </div>
            `;
            customAlertModal.classList.add('show-modal');
            customAlertModal.classList.remove('hidden');

            const answerCallBtn = document.getElementById('answer-call-btn');
            const rejectCallBtn = document.getElementById('reject-call-btn');

            answerCallBtn.onclick = async () => {
                customAlertModal.classList.remove('show-modal');
                customAlertModal.classList.add('hidden');
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
                } finally {
                    // Restore original alert modal content
                    restoreAlertModalContent();
                }
            };

            rejectCallBtn.onclick = async () => {
                customAlertModal.classList.remove('show-modal');
                customAlertModal.classList.add('hidden');
                console.log("Call rejected by user.");
                await update(callRef, { status: 'rejected', endedBy: currentUser.uid, endedByUsername: currentUser.username });
                hangupCall(); // Clean up local state
                // Restore original alert modal content
                restoreAlertModalContent();
            };
        }
    });
    console.log("Listening for incoming calls...");
}

// Function to restore the default alert modal content
function restoreAlertModalContent() {
    const modalContent = customAlertModal.querySelector('.custom-modal-content');
    modalContent.innerHTML = `
        <button id="close-alert-btn" class="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
        <p id="custom-alert-message" class="text-gray-800 dark:text-gray-100 text-lg mb-6"></p>
        <button id="custom-alert-ok-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">OK</button>
    `;
    // Re-attach the default OK and Close button listeners
    document.getElementById('custom-alert-ok-btn').addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    });
    document.getElementById('close-alert-btn').addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    });
}


// Function to hang up the current call
async function hangupCall() {
    if (callRef && currentCallId) {
        console.log("Hanging up call:", currentCallId);
        // Only update Firebase if the call hasn't already been marked as ended by the other party
        const currentCallSnapshot = await get(callRef);
        if (currentCallSnapshot.exists() && currentCallSnapshot.val().status !== 'ended') {
            await update(callRef, { status: 'ended', endedBy: currentUser.uid, endedByUsername: currentUser.username });
        }
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
    showSection('calls-contacts-section'); // Go back to contacts list
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
        localVideo.style.opacity = '0';
    } else {
        toggleVideoBtn.classList.remove('off');
        localVideo.style.opacity = '1';
    }
}

// Event Listeners for Call Controls
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
            updateCallUI();
            console.log(`Video ${isVideoOff ? 'off' : 'on'}`);
        });
    }
});

hangupBtn.addEventListener('click', hangupCall);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    hideLoading(); // Hide loading screen initially, auth listener will show/hide as needed
});

// Default alert modal button listeners
customAlertOkBtn.addEventListener('click', () => {
    customAlertModal.classList.remove('show-modal');
    customAlertModal.classList.add('hidden');
});
closeAlertBtn.addEventListener('click', () => {
    customAlertModal.classList.remove('show-modal');
    customAlertModal.classList.add('hidden');
});
