// calls.js - Fixed and Enhanced Calls Functionality

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
    off,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Firebase Configuration
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

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

// WebRTC Global Variables
let peerConnection = null;
let localStream = null;
let currentCallId = null;
let callType = null;
let callRef = null;
let callEndedListener = null;
let isMicMuted = false;
let isVideoOff = false;
let incomingCallListener = null;
let vibrationInterval = null;
let incomingCallTimeoutId = null;

// Debug logging
function debugLog(message) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
}

// Utility Functions
function showLoading(message = 'Loading...') {
    loadingScreen.querySelector('div:last-child').textContent = message;
    loadingScreen.classList.remove('hidden');
    debugLog(`Showing loading: ${message}`);
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
    debugLog('Loading screen hidden');
}

function showAlert(message, duration = 3000) {
    customAlertMessage.textContent = message;
    customAlertModal.classList.add('show-modal');
    customAlertModal.classList.remove('hidden');
    debugLog(`Showing alert: ${message}`);
    
    setTimeout(() => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    }, duration);
}

function showSection(sectionId) {
    const sections = [authSection, callsContactsSection, callScreen];
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
            section.style.display = 'flex';
            debugLog(`Showing section: ${sectionId}`);
        } else {
            section.classList.add('hidden');
            section.style.display = 'none';
        }
    });
}

// Auth Functionality
toggleAuthModeBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    toggleAuthModeBtn.textContent = isRegisterMode ? 
        'Already have an account? Login' : 
        'Don\'t have an account? Register';
    authMessage.textContent = '';
    debugLog(`Auth mode toggled to ${isRegisterMode ? 'register' : 'login'}`);
});

authSubmitBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!email || !password) {
        authMessage.textContent = 'Please enter email and password.';
        debugLog('Auth attempt with empty fields');
        return;
    }

    showLoading(isRegisterMode ? 'Registering...' : 'Logging in...');
    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const memorableId = generateMemorableId();
            
            await set(ref(db, `users/${user.uid}`), {
                username: email.split('@')[0],
                email: email,
                status: 'Online',
                avatarUrl: '',
                memorableId: memorableId
            });
            
            authMessage.textContent = 'Registration successful! Logging in...';
            debugLog(`User registered: ${user.uid}`);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Login successful!';
            debugLog(`User logged in: ${email}`);
        }
        
        authEmailInput.value = '';
        authPasswordInput.value = '';
    } catch (error) {
        console.error("[AUTH ERROR]", error);
        authMessage.textContent = `Error: ${error.message}`;
        debugLog(`Auth error: ${error.message}`);
    } finally {
        hideLoading();
    }
});

logoutBtn.addEventListener('click', async () => {
    showLoading('Logging out...');
    try {
        await signOut(auth);
        debugLog('User signed out');
    } catch (error) {
        console.error("[AUTH ERROR] Logout failed:", error);
        showAlert(`Logout failed: ${error.message}`);
        debugLog(`Logout error: ${error.message}`);
    } finally {
        hideLoading();
    }
});

function generateMemorableId() {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${randomNumber}${randomChars}`;
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading('Fetching user data...');
        try {
            const snapshot = await get(child(ref(db), `users/${user.uid}`));
            if (snapshot.exists()) {
                currentUser = { uid: user.uid, ...snapshot.val() };
                debugLog(`User data loaded for ${currentUser.username}`);
                
                hideLoading();
                showSection('calls-contacts-section');
                loadUserContacts();
                listenForIncomingCalls();
            } else {
                debugLog('User data not found in DB after login');
                hideLoading();
                showAlert('User data not found. Please try again or contact support.');
                await signOut(auth);
            }
        } catch (error) {
            debugLog(`Error loading user data: ${error.message}`);
            hideLoading();
            showAlert('Error loading user data. Please try again.');
            await signOut(auth);
        }
    } else {
        currentUser = null;
        userContacts = [];
        
        if (incomingCallListener) {
            off(ref(db, 'calls'), 'child_added', incomingCallListener);
            incomingCallListener = null;
            debugLog('Incoming call listener detached on logout');
        }
        
        showSection('auth-section');
        hideLoading();
        debugLog('Showing authentication section');
    }
});

// Contacts Functionality
async function loadUserContacts() {
    if (!currentUser) {
        debugLog('No current user, cannot load contacts');
        return;
    }

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
            
            debugLog(`Loaded ${userContacts.length} contacts`);
        } else {
            userContacts = [];
            debugLog('No contacts found for current user');
        }
        
        renderContactsList();
    } catch (error) {
        console.error("[CONTACTS ERROR] Error loading contacts:", error);
        showAlert("Failed to load contacts.");
        userContacts = [];
        renderContactsList();
        debugLog(`Error loading contacts: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function renderContactsList() {
    if (userContacts.length === 0) {
        contactsListDiv.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No contacts found. Add contacts in the main ThunderChat app to see them here.</div>';
        return;
    }

    // Clear existing content
    contactsListDiv.innerHTML = '';

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    userContacts.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.dataset.contactId = contact.id;
        
        contactItem.innerHTML = `
            <div class="contact-avatar">
                ${contact.avatarUrl ?
                    `<img src="${contact.avatarUrl}" alt="${contact.username}" onerror="this.onerror=null;this.src='https://placehold.co/48x48/007bff/ffffff?text=${contact.username?.charAt(0).toUpperCase() || 'U'}'" />` :
                    `<div>${contact.username?.charAt(0).toUpperCase() || 'U'}</div>`}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username || 'Unknown User'}</div>
            </div>
            <button class="call-icon voice-call-btn" data-contact-id="${contact.id}" data-call-type="voice" title="Voice Call">
                <i class="fas fa-phone"></i>
            </button>
            <button class="call-icon video-call-btn ml-2" data-contact-id="${contact.id}" data-call-type="video" title="Video Call">
                <i class="fas fa-video"></i>
            </button>
        `;

        // Add event listeners directly to the buttons
        const voiceBtn = contactItem.querySelector('.voice-call-btn');
        const videoBtn = contactItem.querySelector('.video-call-btn');
        
        voiceBtn.addEventListener('click', () => handleCallClick(contact, 'voice'));
        videoBtn.addEventListener('click', () => handleCallClick(contact, 'video'));

        fragment.appendChild(contactItem);
    });

    contactsListDiv.appendChild(fragment);
    debugLog('Contacts list rendered with direct event listeners');
}

function handleCallClick(contact, type) {
    debugLog(`Call button clicked for ${contact.username} (${type})`);
    if (!contact.id) {
        debugLog('Invalid contact ID');
        showAlert("Error", "Invalid contact information");
        return;
    }
    startOutgoingCall(contact, type);
}

// WebRTC Call Functionality
async function getLocalStream(video = true) {
    try {
        const mediaConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: video
        };
        
        debugLog('Requesting media with constraints:', mediaConstraints);
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        localVideo.srcObject = localStream;
        localVideo.style.display = video ? 'block' : 'none';
        toggleVideoBtn.style.display = video ? 'flex' : 'none';
        
        isMicMuted = false;
        isVideoOff = false;
        updateCallUI();
        
        debugLog('Local stream obtained');
        return localStream;
    } catch (error) {
        console.error("[WEBRTC ERROR] Error getting user media:", error);
        showAlert("Media Error", `Could not access microphone or camera. Please check permissions. Error: ${error.message}`);
        debugLog(`Media access error: ${error.message}`);
        return null;
    }
}

function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            debugLog(`Stopped local ${track.kind} track`);
        });
        localStream = null;
        localVideo.srcObject = null;
        debugLog('Local stream stopped');
    }
}

function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        debugLog('Existing PeerConnection closed');
    }
    
    try {
        peerConnection = new RTCPeerConnection(rtcConfig);
        debugLog('RTCPeerConnection created');
        
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                debugLog(`Added local ${track.kind} track to PeerConnection`);
            });
        }
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                debugLog(`Generated ICE candidate: ${event.candidate.candidate}`);
                if (currentCallId && callRef) {
                    push(child(callRef, 'candidates/' + currentUser.uid), event.candidate.toJSON())
                        .catch(error => {
                            debugLog(`Failed to send ICE candidate: ${error.message}`);
                        });
                }
            }
        };
        
        peerConnection.ontrack = (event) => {
            debugLog(`Received remote ${event.track.kind} track`);
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.style.display = 'block';
                callStatus.textContent = 'Connected!';
                debugLog('Remote stream connected');
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            debugLog(`Peer connection state: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === 'connected') {
                callStatus.textContent = 'Connected!';
            } else if (peerConnection.connectionState === 'disconnected' || 
                       peerConnection.connectionState === 'failed') {
                showAlert("Call Ended", "The call has been disconnected.");
                hangupCall();
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            debugLog(`ICE connection state: ${peerConnection.iceConnectionState}`);
            if (peerConnection.iceConnectionState === 'failed') {
                debugLog('ICE connection failed, attempting recovery');
                if (peerConnection.restartIce) {
                    peerConnection.restartIce();
                }
            }
        };
        
        return peerConnection;
    } catch (error) {
        console.error("[WEBRTC ERROR] Error creating PeerConnection:", error);
        showAlert("Connection Error", `Failed to establish connection: ${error.message}`);
        debugLog(`PeerConnection creation error: ${error.message}`);
        return null;
    }
}

async function startOutgoingCall(targetContact, type) {
    if (!currentUser || !currentUser.uid) {
        showAlert("Error", "You must be logged in to make a call.");
        return;
    }

    if (currentCallId) {
        showAlert("Error", "You are already in a call.");
        debugLog('Cannot start new call - already in a call');
        return;
    }

    showLoading("Initiating call...");
    callType = type;

    try {
        if (!await getLocalStream(type === 'video')) {
            hideLoading();
            debugLog('Failed to get local stream - call aborted');
            return;
        }

        if (!createPeerConnection()) {
            hideLoading();
            debugLog('Failed to create PeerConnection - call aborted');
            return;
        }

        const offer = await peerConnection.createOffer({
            offerToReceiveVideo: type === 'video',
            offerToReceiveAudio: true
        });
        
        await peerConnection.setLocalDescription(offer);
        debugLog('Created and set local offer');

        const newCallRef = push(ref(db, 'calls'), {
            callerId: currentUser.uid,
            callerUsername: currentUser.username,
            calleeId: targetContact.id,
            calleeUsername: targetContact.username,
            offer: {
                type: offer.type,
                sdp: offer.sdp,
            },
            type: type,
            timestamp: Date.now(),
            status: 'ringing'
        });
        
        currentCallId = newCallRef.key;
        callRef = newCallRef;
        debugLog(`Call created in Firebase with ID: ${currentCallId}`);

        callEndedListener = onValue(callRef, async (snapshot) => {
            const callData = snapshot.val();
            debugLog(`Call state update received: ${callData?.status}`);
            
            if (!callData) {
                debugLog('Call data no longer exists in Firebase. Ending call locally.');
                hangupCall();
                return;
            }

            if (callData.status === 'answered' && callData.answer && peerConnection.remoteDescription?.type !== 'answer') {
                debugLog('Received answer, setting remote description');
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
                    callStatus.textContent = 'Connected!';
                    hideLoading();
                    showSection('call-screen');
                } catch (error) {
                    debugLog(`Error setting remote description: ${error.message}`);
                    showAlert("Connection Error", "Failed to establish connection.");
                    hangupCall();
                }
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
        });

        onChildAdded(child(callRef, 'candidates/' + targetContact.id), (snapshot) => {
            const candidate = new RTCIceCandidate(snapshot.val());
            debugLog(`Received remote ICE candidate: ${candidate.candidate}`);
            peerConnection.addIceCandidate(candidate)
                .catch(error => {
                    debugLog(`Failed to add ICE candidate: ${error.message}`);
                });
        });

        remoteUserDisplay.textContent = `Calling ${targetContact.username}...`;
        callStatus.textContent = 'Ringing...';

        setTimeout(async () => {
            if (!currentCallId) return;
            
            const currentCallSnapshot = await get(callRef);
            if (currentCallSnapshot.exists() && currentCallSnapshot.val().status === 'ringing') {
                debugLog('Outgoing call timeout - no answer');
                await update(callRef, { 
                    status: 'no-answer', 
                    endedBy: 'system',
                    endedAt: Date.now()
                });
            }
        }, 30000);

        hideLoading();
        showSection('call-screen');
    } catch (error) {
        console.error("[CALL ERROR] Error starting outgoing call:", error);
        hideLoading();
        showAlert("Call Error", `Failed to start call: ${error.message}`);
        hangupCall();
        debugLog(`Outgoing call error: ${error.message}`);
    }
}

function listenForIncomingCalls() {
    if (!currentUser || !currentUser.uid) {
        debugLog('Not logged in, cannot listen for calls');
        return;
    }

    const callsRef = query(
        ref(db, 'calls'),
        orderByChild('calleeId'),
        equalTo(currentUser.uid)
    );

    if (incomingCallListener) {
        off(callsRef, 'child_added', incomingCallListener);
        debugLog('Existing incoming call listener detached');
    }

    incomingCallListener = onChildAdded(callsRef, async (snapshot) => {
        const callData = snapshot.val();
        const callId = snapshot.key;
        
        debugLog(`Incoming call check: ${callId} for ${callData.calleeId}`);
        
        if (callData.calleeId === currentUser.uid && callData.status === 'ringing') {
            debugLog(`Incoming call detected from ${callData.callerUsername} (${callData.callerId})`);
            
            if (currentCallId) {
                debugLog('Already in a call, rejecting incoming call');
                await update(ref(db, `calls/${callId}`), { 
                    status: 'rejected', 
                    endedBy: currentUser.uid, 
                    endedByUsername: currentUser.username,
                    endedAt: Date.now()
                });
                return;
            }

            currentCallId = callId;
            callRef = ref(db, `calls/${callId}`);
            callType = callData.type;
            
            if ('vibrate' in navigator) {
                debugLog('Starting vibration for incoming call');
                vibrationInterval = setInterval(() => {
                    navigator.vibrate([500, 200, 500, 200]);
                }, 1400);
            }

            const modalContent = customAlertModal.querySelector('.custom-modal-content');
            modalContent.innerHTML = `
                <button id="close-alert-btn" class="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
                <p class="text-gray-800 dark:text-gray-100 text-lg mb-6">Incoming ${callData.type} call from ${callData.callerUsername}. Do you want to answer?</p>
                <div class="flex justify-center gap-4">
                    <button id="answer-call-btn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">Answer</button>
                    <button id="reject-call-btn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">Reject</button>
                </div>
            `;
            
            customAlertModal.classList.add('show-modal');
            customAlertModal.classList.remove('hidden');
            debugLog('Incoming call modal shown');

            const answerCallBtn = document.getElementById('answer-call-btn');
            const rejectCallBtn = document.getElementById('reject-call-btn');
            const closeAlertBtn = document.getElementById('close-alert-btn');

            incomingCallTimeoutId = setTimeout(async () => {
                const currentCallSnapshot = await get(callRef);
                if (currentCallSnapshot.exists() && currentCallSnapshot.val().status === 'ringing') {
                    debugLog('Incoming call timeout - no answer');
                    await update(callRef, { 
                        status: 'no-answer', 
                        endedBy: 'system',
                        endedAt: Date.now()
                    });
                    hangupCall();
                    showAlert("Call Missed", `Missed call from ${callData.callerUsername}`);
                }
                restoreAlertModalContent();
            }, 30000);

            answerCallBtn.onclick = async () => {
                clearTimeout(incomingCallTimeoutId);
                if (vibrationInterval) {
                    clearInterval(vibrationInterval);
                    if ('vibrate' in navigator) navigator.vibrate(0);
                    vibrationInterval = null;
                    debugLog('Vibration stopped on answer');
                }
                
                customAlertModal.classList.remove('show-modal');
                customAlertModal.classList.add('hidden');
                debugLog('Incoming call modal hidden on answer');
                
                showLoading("Answering call...");
                try {
                    if (!await getLocalStream(callType === 'video')) {
                        await update(callRef, { 
                            status: 'rejected', 
                            endedBy: currentUser.uid,
                            endedAt: Date.now()
                        });
                        hideLoading();
                        hangupCall();
                        return;
                    }

                    if (!createPeerConnection()) {
                        await update(callRef, { 
                            status: 'rejected', 
                            endedBy: currentUser.uid,
                            endedAt: Date.now()
                        });
                        hideLoading();
                        hangupCall();
                        return;
                    }

                    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
                    debugLog('Set remote offer');

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    debugLog('Created and set local answer');

                    await update(callRef, {
                        answer: {
                            type: answer.type,
                            sdp: answer.sdp,
                        },
                        status: 'answered',
                        answeredAt: Date.now()
                    });
                    debugLog('Call answered and updated in Firebase');

                    onChildAdded(child(callRef, 'candidates/' + callData.callerId), (snapshot) => {
                        const candidate = new RTCIceCandidate(snapshot.val());
                        debugLog(`Received remote ICE candidate: ${candidate.candidate}`);
                        peerConnection.addIceCandidate(candidate);
                    });

                    callEndedListener = onValue(callRef, (snap) => {
                        const updatedCallData = snap.val();
                        if (!updatedCallData) {
                            debugLog('Call node removed, ending call locally');
                            hangupCall();
                            return;
                        }
                        if (updatedCallData.status === 'ended' || 
                            updatedCallData.status === 'no-answer' || 
                            updatedCallData.status === 'rejected') {
                            if (updatedCallData.endedBy !== currentUser.uid) {
                                showAlert("Call Ended", `${updatedCallData.endedByUsername || 'The other party'} ended the call.`);
                            }
                            hangupCall();
                        }
                    });

                    remoteUserDisplay.textContent = `Connected with ${callData.callerUsername}`;
                    callStatus.textContent = 'Connecting...';
                    
                    hideLoading();
                    showSection('call-screen');
                } catch (error) {
                    console.error("[CALL ERROR] Error answering call:", error);
                    hideLoading();
                    showAlert("Call Error", `Failed to answer call: ${error.message}`);
                    
                    await update(callRef, { 
                        status: 'rejected', 
                        endedBy: currentUser.uid, 
                        endedByUsername: currentUser.username,
                        endedAt: Date.now()
                    });
                    
                    hangupCall();
                    debugLog(`Error answering call: ${error.message}`);
                } finally {
                    restoreAlertModalContent();
                }
            };

            rejectCallBtn.onclick = async () => {
                clearTimeout(incomingCallTimeoutId);
                if (vibrationInterval) {
                    clearInterval(vibrationInterval);
                    if ('vibrate' in navigator) navigator.vibrate(0);
                    vibrationInterval = null;
                    debugLog('Vibration stopped on reject');
                }
                
                customAlertModal.classList.remove('show-modal');
                customAlertModal.classList.add('hidden');
                debugLog('Call rejected by user');
                
                await update(callRef, { 
                    status: 'rejected', 
                    endedBy: currentUser.uid, 
                    endedByUsername: currentUser.username,
                    endedAt: Date.now()
                });
                
                hangupCall();
                restoreAlertModalContent();
            };

            closeAlertBtn.onclick = () => {
                clearTimeout(incomingCallTimeoutId);
                if (vibrationInterval) {
                    clearInterval(vibrationInterval);
                    if ('vibrate' in navigator) navigator.vibrate(0);
                    vibrationInterval = null;
                }
                customAlertModal.classList.remove('show-modal');
                customAlertModal.classList.add('hidden');
                restoreAlertModalContent();
            };
        }
    });
    
    debugLog('Listening for incoming calls with proper filtering');
}

function restoreAlertModalContent() {
    const modalContent = customAlertModal.querySelector('.custom-modal-content');
    modalContent.innerHTML = `
        <button id="close-alert-btn" class="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl font-bold">&times;</button>
        <p id="custom-alert-message" class="text-gray-800 dark:text-gray-100 text-lg mb-6"></p>
        <button id="custom-alert-ok-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200">OK</button>
    `;
    
    document.getElementById('custom-alert-ok-btn').addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    });
    
    document.getElementById('close-alert-btn').addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
    });
    
    debugLog('Alert modal content restored');
}

async function hangupCall() {
    debugLog(`Hangup initiated for call ${currentCallId}`);
    
    clearTimeout(incomingCallTimeoutId);
    incomingCallTimeoutId = null;
    
    if (vibrationInterval) {
        clearInterval(vibrationInterval);
        if ('vibrate' in navigator) navigator.vibrate(0);
        vibrationInterval = null;
        debugLog('Vibration stopped');
    }

    if (callRef && currentCallId) {
        try {
            const currentCallSnapshot = await get(callRef);
            if (currentCallSnapshot.exists() && 
                currentCallSnapshot.val().status !== 'ended' && 
                currentCallSnapshot.val().status !== 'no-answer' && 
                currentCallSnapshot.val().status !== 'rejected') {
                
                debugLog('Updating Firebase call status to ended');
                await update(callRef, { 
                    status: 'ended', 
                    endedBy: currentUser?.uid || 'system',
                    endedByUsername: currentUser?.username || 'System',
                    endedAt: Date.now()
                });
            }
        } catch (error) {
            debugLog(`Error updating call status: ${error.message}`);
        }
    }
    
    if (peerConnection) {
        try {
            peerConnection.close();
            debugLog('PeerConnection closed');
        } catch (error) {
            debugLog(`Error closing PeerConnection: ${error.message}`);
        } finally {
            peerConnection = null;
        }
    }
    
    stopLocalStream();
    
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        debugLog('Remote stream stopped');
    }
    
    remoteVideo.style.display = 'none';
    callStatus.textContent = '';
    remoteUserDisplay.textContent = '';
    
    currentCallId = null;
    callRef = null;
    callType = null;
    
    isMicMuted = false;
    isVideoOff = false;
    updateCallUI();
    
    showSection('calls-contacts-section');
    debugLog('Call completely cleaned up');
    
    if (callEndedListener) {
        off(callRef, 'value', callEndedListener);
        callEndedListener = null;
        debugLog('Call ended listener detached');
    }
}

function updateCallUI() {
    if (isMicMuted) {
        toggleMicBtn.classList.add('off');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        toggleMicBtn.classList.remove('off');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }

    if (isVideoOff || callType !== 'video') {
        toggleVideoBtn.classList.add('off');
        toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        localVideo.style.opacity = '0.5';
    } else {
        toggleVideoBtn.classList.remove('off');
        toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
        localVideo.style.opacity = '1';
    }
    
    debugLog(`UI updated: Mic ${isMicMuted ? 'muted' : 'unmuted'}, Video ${isVideoOff ? 'off' : 'on'}`);
}

// Event Listeners
toggleMicBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            isMicMuted = !track.enabled;
            updateCallUI();
            debugLog(`Mic ${isMicMuted ? 'muted' : 'unmuted'}`);
        });
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (localStream && callType === 'video') {
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
            isVideoOff = !track.enabled;
            updateCallUI();
            debugLog(`Video ${isVideoOff ? 'disabled' : 'enabled'}`);
        });
    }
});

hangupBtn.addEventListener('click', hangupCall);

customAlertOkBtn.addEventListener('click', () => {
    customAlertModal.classList.remove('show-modal');
    customAlertModal.classList.add('hidden');
    debugLog('Alert modal closed by OK button');
});

closeAlertBtn.addEventListener('click', () => {
    customAlertModal.classList.remove('show-modal');
    customAlertModal.classList.add('hidden');
    debugLog('Alert modal closed by X button');
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    showLoading('Initializing...');
    debugLog('Application initialized');
});
