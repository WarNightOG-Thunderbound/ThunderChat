// calls.js - Premium WebRTC Calls Implementation

// Enhanced Firebase imports with additional features
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
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
    remove,
    query,
    orderByChild,
    equalTo,
    limitToLast
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

// DOM Elements with additional UI components
const loadingScreen = document.getElementById('loading-screen');
const loadingMessage = document.getElementById('loading-message');
const loadingSubmessage = document.getElementById('loading-submessage');
const loadingBar = document.getElementById('loading-bar');
const loadingProgress = document.getElementById('loading-progress');

const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authBtnText = document.getElementById('auth-btn-text');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const authMessage = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-btn');

const callsContactsSection = document.getElementById('calls-contacts-section');
const contactsListDiv = document.getElementById('contacts-list');
const refreshContactsBtn = document.getElementById('refresh-contacts-btn');
const contactsSearchInput = document.querySelector('#contacts-search input');

const callScreen = document.getElementById('call-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callStatus = document.getElementById('call-status');
const remoteUserDisplay = document.getElementById('remote-user-display');
const callTimer = document.getElementById('call-timer');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const toggleSpeakerBtn = document.getElementById('toggle-speaker-btn');
const hangupBtn = document.getElementById('hangup-btn');
const callStats = document.getElementById('call-stats');
const statsConnection = document.getElementById('stats-connection');
const statsAudio = document.getElementById('stats-audio');
const statsVideo = document.getElementById('stats-video');
const statsPackets = document.getElementById('stats-packets');

const incomingCallScreen = document.getElementById('incoming-call-screen');
const incomingCallTitle = document.getElementById('incoming-call-title');
const incomingCallerName = document.getElementById('incoming-caller-name');
const incomingCallType = document.getElementById('incoming-call-type');
const answerCallBtn = document.getElementById('answer-call-btn');
const rejectCallBtn = document.getElementById('reject-call-btn');

const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
const closeAlertBtn = document.getElementById('close-alert-btn');
const alertButtons = document.getElementById('alert-buttons');
const alertIcon = document.getElementById('alert-icon');

const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');
const toggleDebugBtn = document.getElementById('toggle-debug');
const showDebugBtn = document.getElementById('show-debug-btn');

const callQualityIndicator = document.getElementById('call-quality-indicator');
const qualityStatus = document.getElementById('quality-status');
const qualityLevel = document.getElementById('quality-level');

// Application State
let currentUser = null;
let userContacts = [];
let isRegisterMode = false;
let callStartTime = null;
let callTimerInterval = null;
let debugMode = false;

// WebRTC Enhanced Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Additional fallback STUN servers
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.voipstunt.com' },
        // TURN servers would be added here in production
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all',
    // Enhanced audio/video codec preferences
    sdpSemantics: 'unified-plan',
    codecs: {
        audio: [
            'opus/48000/2',
            'ISAC/16000',
            'ISAC/32000',
            'G722/8000',
            'PCMU/8000',
            'PCMA/8000'
        ],
        video: [
            'VP9/90000',
            'H264/90000',
            'VP8/90000'
        ]
    }
};

// WebRTC Global Variables
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCallId = null;
let callType = null;
let callRef = null;
let callEndedListener = null;
let isMicMuted = false;
let isVideoOff = false;
let isSpeakerOn = true;
let incomingCallListener = null;
let vibrationInterval = null;
let incomingCallTimeoutId = null;
let statsInterval = null;
let qualityMonitorInterval = null;

// Debugging and logging system
function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 23);
    const typeClass = `debug-${type}`;
    const logEntry = document.createElement('div');
    logEntry.className = typeClass;
    logEntry.textContent = `[${timestamp}] ${message}`;
    debugContent.appendChild(logEntry);
    debugContent.scrollTop = debugContent.scrollHeight;
    
    // Keep only the last 100 debug messages
    while (debugContent.children.length > 100) {
        debugContent.removeChild(debugContent.firstChild);
    }
    
    // Also log to console
    switch (type) {
        case 'warning':
            console.warn(message);
            break;
        case 'error':
            console.error(message);
            break;
        case 'success':
            console.log('%c' + message, 'color: #4CAF50');
            break;
        default:
            console.log(message);
    }
}

// Show loading screen with progress updates
function showLoading(message = 'Loading...', submessage = '', progress = 0) {
    loadingMessage.textContent = message;
    loadingSubmessage.textContent = submessage;
    loadingBar.style.width = `${progress}%`;
    loadingScreen.classList.remove('hidden');
    
    // Animate the progress spinner
    if (progress > 0) {
        loadingProgress.style.transform = `rotate(${progress * 3.6}deg)`;
    }
    
    debugLog(`Showing loading: ${message} (${submessage}) - ${progress}%`, 'info');
}

// Hide loading screen
function hideLoading() {
    loadingScreen.classList.add('hidden');
    debugLog('Loading screen hidden', 'info');
}

// Update loading progress
function updateLoading(progress, submessage = '') {
    loadingBar.style.width = `${progress}%`;
    loadingProgress.style.transform = `rotate(${progress * 3.6}deg)`;
    if (submessage) loadingSubmessage.textContent = submessage;
}

// Show alert with different types (success, error, warning, info)
function showAlert(message, type = 'info', duration = 3000) {
    customAlertMessage.textContent = message;
    
    // Set icon based on alert type
    switch (type) {
        case 'error':
            alertIcon.className = 'fas fa-exclamation-circle text-4xl text-red-500 mb-4';
            break;
        case 'success':
            alertIcon.className = 'fas fa-check-circle text-4xl text-green-500 mb-4';
            break;
        case 'warning':
            alertIcon.className = 'fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4';
            break;
        default:
            alertIcon.className = 'fas fa-info-circle text-4xl text-blue-500 mb-4';
    }
    
    customAlertModal.classList.add('show-modal');
    customAlertModal.classList.remove('hidden');
    
    debugLog(`Showing alert: ${message} (${type})`, type);
    
    if (duration > 0) {
        setTimeout(() => {
            customAlertModal.classList.remove('show-modal');
            customAlertModal.classList.add('hidden');
            debugLog(`Alert auto-hidden: ${message}`, 'info');
        }, duration);
    }
}

// Show prompt with custom buttons
function showPrompt(message, buttons = []) {
    customAlertMessage.textContent = message;
    alertButtons.innerHTML = '';
    
    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.className = button.class || 'bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200';
        btn.onclick = button.action;
        alertButtons.appendChild(btn);
    });
    
    customAlertModal.classList.add('show-modal');
    customAlertModal.classList.remove('hidden');
    debugLog(`Showing prompt: ${message}`, 'info');
}

// Section management
function showSection(sectionId) {
    const sections = [authSection, callsContactsSection, callScreen, incomingCallScreen];
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
            section.style.display = 'flex';
            debugLog(`Showing section: ${sectionId}`, 'info');
        } else {
            section.classList.add('hidden');
            section.style.display = 'none';
        }
    });
}

// Toggle debug panel
function toggleDebugPanel() {
    debugPanel.classList.toggle('hidden');
    debugMode = !debugPanel.classList.contains('hidden');
    debugLog(`Debug panel ${debugMode ? 'shown' : 'hidden'}`, 'info');
}

// Update call quality indicator
function updateCallQuality(quality) {
    callQualityIndicator.classList.remove('hidden');
    
    // quality: 1-5 (1=poor, 5=excellent)
    const levels = qualityLevel.querySelectorAll('div');
    levels.forEach((level, index) => {
        if (index < quality) {
            level.classList.add('active');
            if (quality >= 4) level.classList.add('excellent');
            else if (quality >= 2) level.classList.add('good');
            else level.classList.add('poor');
        } else {
            level.classList.remove('active', 'excellent', 'good', 'poor');
        }
    });
    
    // Update status text
    let statusText = '';
    if (quality >= 4) statusText = 'Excellent';
    else if (quality >= 3) statusText = 'Good';
    else if (quality >= 2) statusText = 'Fair';
    else statusText = 'Poor';
    
    qualityStatus.textContent = `Connection Quality: ${statusText}`;
}

// Start call timer
function startCallTimer() {
    callStartTime = Date.now();
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(updateCallTimer, 1000);
    debugLog('Call timer started', 'info');
}

// Update call timer display
function updateCallTimer() {
    if (!callStartTime) return;
    
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    callTimer.textContent = `${minutes}:${seconds}`;
}

// Stop call timer
function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimer.textContent = '00:00';
    callStartTime = null;
    debugLog('Call timer stopped', 'info');
}

// Monitor call quality and statistics
function startQualityMonitor() {
    if (!peerConnection) return;
    
    clearInterval(qualityMonitorInterval);
    qualityMonitorInterval = setInterval(() => {
        if (!peerConnection) return;
        
        peerConnection.getStats().then(stats => {
            let audioStats = { packetsLost: 0, packetsSent: 0, jitter: 0 };
            let videoStats = { packetsLost: 0, packetsSent: 0, framesPerSecond: 0 };
            let connectionStats = { currentRoundTripTime: 0 };
            
            stats.forEach(report => {
                // Audio stats
                if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                    audioStats.packetsSent = report.packetsSent || 0;
                    audioStats.packetsLost = report.packetsLost || 0;
                }
                
                if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                    audioStats.jitter = report.jitter || 0;
                }
                
                // Video stats
                if (report.type === 'outbound-rtp' && report.kind === 'video') {
                    videoStats.packetsSent = report.packetsSent || 0;
                    videoStats.packetsLost = report.packetsLost || 0;
                    videoStats.framesPerSecond = report.framesPerSecond || 0;
                }
                
                // Connection stats
                if (report.type === 'candidate-pair' && report.nominated) {
                    connectionStats.currentRoundTripTime = report.currentRoundTripTime || 0;
                }
            });
            
            // Calculate quality score (1-5)
            let qualityScore = 5;
            
            // Audio quality factors
            const audioLossPercent = audioStats.packetsSent > 0 ? 
                (audioStats.packetsLost / audioStats.packetsSent) * 100 : 0;
            
            if (audioLossPercent > 10) qualityScore -= 2;
            else if (audioLossPercent > 5) qualityScore -= 1;
            
            // Video quality factors
            const videoLossPercent = videoStats.packetsSent > 0 ? 
                (videoStats.packetsLost / videoStats.packetsSent) * 100 : 0;
            
            if (videoLossPercent > 15) qualityScore -= 2;
            else if (videoLossPercent > 5) qualityScore -= 1;
            
            // Connection quality factors
            if (connectionStats.currentRoundTripTime > 0.5) qualityScore -= 1;
            if (connectionStats.currentRoundTripTime > 1.0) qualityScore -= 1;
            
            // Ensure quality score is between 1 and 5
            qualityScore = Math.max(1, Math.min(5, qualityScore));
            
            // Update UI
            updateCallQuality(qualityScore);
            
            // Update debug stats if visible
            if (debugMode) {
                statsConnection.textContent = `${(connectionStats.currentRoundTripTime * 1000).toFixed(0)}ms RTT`;
                statsAudio.textContent = `${audioStats.packetsLost} lost (${audioLossPercent.toFixed(1)}%) | ${audioStats.jitter.toFixed(2)}s jitter`;
                statsVideo.textContent = `${videoStats.packetsLost} lost (${videoLossPercent.toFixed(1)}%) | ${videoStats.framesPerSecond}fps`;
                statsPackets.textContent = `A:${audioStats.packetsSent} V:${videoStats.packetsSent}`;
            }
            
            debugLog(`Quality monitor: Audio ${audioLossPercent.toFixed(1)}% loss, Video ${videoLossPercent.toFixed(1)}% loss, RTT ${(connectionStats.currentRoundTripTime * 1000).toFixed(0)}ms`, 'info');
        });
    }, 2000); // Update every 2 seconds
    
    debugLog('Quality monitor started', 'info');
}

// Stop quality monitoring
function stopQualityMonitor() {
    clearInterval(qualityMonitorInterval);
    callQualityIndicator.classList.add('hidden');
    debugLog('Quality monitor stopped', 'info');
}

// --- Authentication Functionality ---
toggleAuthModeBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    authBtnText.textContent = isRegisterMode ? 'Register' : 'Login';
    toggleAuthModeBtn.textContent = isRegisterMode ? 
        'Already have an account? Login' : 
        'Don\'t have an account? Register';
    authMessage.textContent = '';
    debugLog(`Auth mode toggled to ${isRegisterMode ? 'register' : 'login'}`, 'info');
});

authSubmitBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!email || !password) {
        authMessage.textContent = 'Please enter email and password.';
        debugLog('Auth attempt with empty fields', 'warning');
        return;
    }

    showLoading(isRegisterMode ? 'Registering...' : 'Logging in...', 'Connecting to server', 10);
    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            updateLoading(30, 'Creating user profile');
            
            // Generate memorable ID and username
            const memorableId = generateMemorableId();
            const username = email.split('@')[0];
            
            // Update user profile with display name
            await updateProfile(user, {
                displayName: username
            });
            
            updateLoading(60, 'Saving user data');
            
            // Store user data in Realtime Database
            await set(ref(db, `users/${user.uid}`), {
                username: username,
                email: email,
                status: 'Online',
                avatarUrl: '',
                memorableId: memorableId,
                lastSeen: Date.now()
            });
            
            updateLoading(90, 'Finalizing setup');
            
            authMessage.textContent = 'Registration successful! Logging in...';
            debugLog(`User registered: ${user.uid} (${email})`, 'success');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Login successful!';
            debugLog(`User logged in: ${email}`, 'success');
        }
        
        authEmailInput.value = '';
        authPasswordInput.value = '';
    } catch (error) {
        console.error("[AUTH ERROR]", error);
        authMessage.textContent = `Error: ${error.message}`;
        debugLog(`Auth error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

logoutBtn.addEventListener('click', async () => {
    showLoading('Logging out...', 'Cleaning up session', 10);
    try {
        await signOut(auth);
        debugLog('User signed out', 'info');
    } catch (error) {
        console.error("[AUTH ERROR] Logout failed:", error);
        showAlert(`Logout failed: ${error.message}`, 'error');
        debugLog(`Logout error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// Generate a memorable ID with better uniqueness
function generateMemorableId() {
    const adjectives = ['happy', 'sunny', 'brave', 'calm', 'gentle', 'jolly', 'kind', 'lucky', 'merry', 'proud'];
    const nouns = ['apple', 'banana', 'cherry', 'dragon', 'eagle', 'fox', 'giraffe', 'horse', 'ice', 'jungle'];
    const randomNumber = Math.floor(100 + Math.random() * 900); // 3-digit number
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}-${noun}-${randomNumber}`.toUpperCase();
}

// Auth state listener with enhanced user data handling
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading('Authenticating...', 'Loading user data', 20);
        try {
            const snapshot = await get(child(ref(db), `users/${user.uid}`));
            
            if (snapshot.exists()) {
                currentUser = { 
                    uid: user.uid, 
                    email: user.email,
                    displayName: user.displayName,
                    ...snapshot.val() 
                };
                
                updateLoading(60, 'Loading contacts');
                debugLog(`User data loaded for ${currentUser.username} (${currentUser.uid})`, 'success');
                
                // Update user status to online
                await update(ref(db, `users/${currentUser.uid}`), {
                    status: 'Online',
                    lastSeen: Date.now()
                });
                
                updateLoading(80, 'Setting up call listeners');
                hideLoading();
                showSection('calls-contacts-section');
                loadUserContacts();
                listenForIncomingCalls();
            } else {
                debugLog('User data not found in DB after login', 'error');
                hideLoading();
                showAlert('User data not found. Please try again or contact support.', 'error');
                await signOut(auth);
            }
        } catch (error) {
            debugLog(`Error loading user data: ${error.message}`, 'error');
            hideLoading();
            showAlert('Error loading user data. Please try again.', 'error');
            await signOut(auth);
        }
    } else {
        currentUser = null;
        userContacts = [];
        
        // Clean up all listeners
        if (incomingCallListener) {
            off(ref(db, 'calls'), 'child_added', incomingCallListener);
            incomingCallListener = null;
            debugLog('Incoming call listener detached on logout', 'info');
        }
        
        showSection('auth-section');
        hideLoading();
        debugLog('Showing authentication section', 'info');
    }
});

// --- Contacts Functionality ---
async function loadUserContacts() {
    if (!currentUser) {
        debugLog('No current user, cannot load contacts', 'warning');
        return;
    }

    showLoading('Loading contacts...', 'Fetching contact list', 10);
    try {
        const snapshot = await get(child(ref(db), `userContacts/${currentUser.uid}`));
        
        updateLoading(40, 'Processing contacts');
        
        if (snapshot.exists()) {
            const contactsData = snapshot.val();
            const contactIds = Object.keys(contactsData);
            
            userContacts = [];
            const contactPromises = contactIds.map(async contactId => {
                const userSnapshot = await get(child(ref(db), `users/${contactId}`));
                if (userSnapshot.exists()) {
                    const contactData = userSnapshot.val();
                    userContacts.push({
                        id: contactId,
                        ...contactData,
                        // Add online status based on last seen
                        isOnline: contactData.status === 'Online' || 
                                 (contactData.lastSeen && (Date.now() - contactData.lastSeen) < 300000) // 5 minutes
                    });
                }
            });
            
            await Promise.all(contactPromises);
            
            updateLoading(80, 'Rendering contacts');
            debugLog(`Loaded ${userContacts.length} contacts`, 'success');
        } else {
            userContacts = [];
            debugLog('No contacts found for current user', 'info');
        }
        
        renderContactsList();
    } catch (error) {
        console.error("[CONTACTS ERROR] Error loading contacts:", error);
        showAlert("Failed to load contacts.", 'error');
        userContacts = [];
        renderContactsList();
        debugLog(`Error loading contacts: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Enhanced contact list rendering with search and online status
function renderContactsList() {
    if (userContacts.length === 0) {
        contactsListDiv.innerHTML = `
            <div class="text-gray-500 dark:text-gray-400 text-center py-12 flex flex-col items-center">
                <i class="fas fa-users text-4xl mb-4 text-gray-300 dark:text-gray-600"></i>
                <p class="text-lg">No contacts found</p>
                <p class="text-sm mt-2">Add contacts in the main ThunderChat app</p>
            </div>
        `;
        return;
    }

    // Sort contacts - online first, then by name
    const sortedContacts = [...userContacts].sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.username || '').localeCompare(b.username || '');
    });

    contactsListDiv.innerHTML = sortedContacts.map(contact => `
        <div class="contact-item" data-contact-id="${contact.id}">
            <div class="contact-avatar ${contact.isOnline ? 'online' : ''}">
                ${contact.avatarUrl ?
                    `<img src="${contact.avatarUrl}" alt="${contact.username}" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${contact.username?.charAt(0) || 'U'}&background=3b82f6&color=fff&size=128'">` :
                    `<div>${contact.username?.charAt(0).toUpperCase() || 'U'}</div>`}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username || 'Unknown User'}</div>
                <div class="contact-status">${contact.isOnline ? 'Online' : 'Offline'}</div>
            </div>
            <button class="call-icon" data-contact-id="${contact.id}" data-call-type="voice" title="Voice Call">
                <i class="fas fa-phone"></i>
            </button>
            <button class="call-icon ml-2" data-contact-id="${contact.id}" data-call-type="video" title="Video Call">
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
                debugLog(`Initiating ${type} call to ${contact.username} (${contact.id})`, 'info');
                startOutgoingCall(contact, type);
            }
        });
    });
    
    // Add contact item click handler for future features
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('call-icon')) {
                const contactId = item.getAttribute('data-contact-id');
                const contact = userContacts.find(c => c.id === contactId);
                if (contact) {
                    // Future: Show contact details
                }
            }
        });
    });
    
    debugLog('Contacts list rendered', 'info');
}

// Contact search functionality
contactsSearchInput.addEventListener('input', () => {
    const searchTerm = contactsSearchInput.value.toLowerCase();
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        const contactName = item.querySelector('.contact-name').textContent.toLowerCase();
        if (contactName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Refresh contacts button
refreshContactsBtn.addEventListener('click', () => {
    debugLog('Manual contacts refresh triggered', 'info');
    loadUserContacts();
});

// --- WebRTC Call Functionality ---

// Enhanced local media stream with better echo cancellation
async function getLocalStream(video = true) {
    try {
        // Advanced media constraints with echo cancellation
        const mediaConstraints = {
            audio: {
                echoCancellation: { exact: true },
                noiseSuppression: { exact: true },
                autoGainControl: { exact: true },
                channelCount: 1, // Mono audio for better compatibility
                sampleRate: 48000, // Higher quality audio
                sampleSize: 16,
                latency: 0.01 // Low latency
            },
            video: video ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: 'user'
            } : false
        };
        
        debugLog('Requesting media with constraints:', 'info');
        debugLog(JSON.stringify(mediaConstraints, null, 2), 'info');
        
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Apply additional audio processing if available
        if (localStream.getAudioTracks().length > 0) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack.applyConstraints) {
                try {
                    await audioTrack.applyConstraints({
                        advanced: [
                            { echoCancellation: true },
                            { noiseSuppression: true },
                            { autoGainControl: true }
                        ]
                    });
                    debugLog('Applied advanced audio constraints', 'success');
                } catch (constraintError) {
                    debugLog(`Could not apply advanced audio constraints: ${constraintError.message}`, 'warning');
                }
            }
        }
        
        localVideo.srcObject = localStream;
        localVideo.style.display = video ? 'block' : 'none';
        toggleVideoBtn.style.display = video ? 'flex' : 'none';
        
        // Reset control states
        isMicMuted = false;
        isVideoOff = false;
        isSpeakerOn = true;
        
        updateCallUI();
        
        debugLog('Local stream obtained with enhanced audio constraints', 'success');
        return localStream;
    } catch (error) {
        console.error("[WEBRTC ERROR] Error getting user media:", error);
        showAlert("Media Error", `Could not access microphone or camera. Please check permissions. Error: ${error.message}`, 'error');
        debugLog(`Media access error: ${error.message}`, 'error');
        return null;
    }
}

// Stop local media stream
function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            debugLog(`Stopped local ${track.kind} track`, 'info');
        });
        localStream = null;
        localVideo.srcObject = null;
        debugLog('Local stream stopped', 'info');
    }
}

// Create RTCPeerConnection with enhanced error handling
function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        debugLog('Existing PeerConnection closed', 'info');
    }
    
    try {
        peerConnection = new RTCPeerConnection(rtcConfig);
        debugLog('RTCPeerConnection created with config:', 'info');
        debugLog(JSON.stringify(rtcConfig, null, 2), 'info');
        
        // Add local stream tracks to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                debugLog(`Added local ${track.kind} track to PeerConnection`, 'info');
            });
        }
        
        // ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                debugLog(`Generated ICE candidate: ${event.candidate.candidate}`, 'info');
                if (currentCallId && callRef) {
                    push(child(callRef, 'candidates/' + currentUser.uid), event.candidate.toJSON())
                        .catch(error => {
                            debugLog(`Failed to send ICE candidate: ${error.message}`, 'error');
                        });
                }
            } else {
                debugLog('ICE gathering complete', 'info');
            }
        };
        
        // Remote track handling
        peerConnection.ontrack = (event) => {
            debugLog(`Received remote ${event.track.kind} track`, 'info');
            if (!remoteStream) {
                remoteStream = new MediaStream();
                remoteVideo.srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
            
            // Update UI when tracks are added
            if (event.track.kind === 'video') {
                remoteVideo.style.display = 'block';
                callStatus.textContent = 'Connected!';
                debugLog('Video stream connected', 'success');
            }
        };
        
        // Connection state changes
        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            debugLog(`Peer connection state changed: ${state}`, 'info');
            
            switch (state) {
                case 'connected':
                    callStatus.textContent = 'Connected!';
                    startCallTimer();
                    startQualityMonitor();
                    if (debugMode) callStats.classList.remove('hidden');
                    break;
                case 'disconnected':
                case 'failed':
                    showAlert("Call Ended", "The call has been disconnected.", 'error');
                    hangupCall();
                    break;
                case 'closed':
                    debugLog('PeerConnection completely closed', 'info');
                    break;
            }
        };
        
        // ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
            const state = peerConnection.iceConnectionState;
            debugLog(`ICE connection state changed: ${state}`, 'info');
            
            if (state === 'failed' || state === 'disconnected') {
                // Attempt to restart ICE
                debugLog('ICE connection failed or disconnected, attempting recovery', 'warning');
                if (peerConnection.restartIce) {
                    peerConnection.restartIce();
                    debugLog('ICE restart initiated', 'info');
                }
            }
        };
        
        // ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
            debugLog(`ICE gathering state: ${peerConnection.iceGatheringState}`, 'info');
        };
        
        // Signaling state changes
        peerConnection.onsignalingstatechange = () => {
            debugLog(`Signaling state: ${peerConnection.signalingState}`, 'info');
        };
        
        // Data channel (for future features)
        peerConnection.ondatachannel = (event) => {
            debugLog(`Data channel received: ${event.channel.label}`, 'info');
        };
        
        return peerConnection;
    } catch (error) {
        console.error("[WEBRTC ERROR] Error creating PeerConnection:", error);
        showAlert("Connection Error", `Failed to establish connection: ${error.message}`, 'error');
        debugLog(`PeerConnection creation error: ${error.message}`, 'error');
        return null;
    }
}

// Start an outgoing call with enhanced reliability
async function startOutgoingCall(targetContact, type) {
    if (!currentUser || !currentUser.uid) {
        showAlert("Error", "You must be logged in to make a call.", 'error');
        return;
    }

    if (currentCallId) {
        showAlert("Error", "You are already in a call.", 'error');
        debugLog('Cannot start new call - already in a call', 'warning');
        return;
    }

    showLoading("Initiating call...", `Connecting to ${targetContact.username}`, 10);
    callType = type;

    try {
        // Step 1: Get local media stream
        updateLoading(20, 'Accessing media devices');
        if (!await getLocalStream(type === 'video')) {
            hideLoading();
            debugLog('Failed to get local stream - call aborted', 'error');
            return;
        }

        // Step 2: Create RTCPeerConnection
        updateLoading(30, 'Establishing connection');
        if (!createPeerConnection()) {
            hideLoading();
            debugLog('Failed to create PeerConnection - call aborted', 'error');
            return;
        }

        // Step 3: Create offer with better SDP options
        updateLoading(50, 'Creating offer');
        const offerOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === 'video',
            iceRestart: false,
            voiceActivityDetection: false // Reduces bandwidth usage
        };
        
        const offer = await peerConnection.createOffer(offerOptions);
        debugLog('Created offer:', 'info');
        debugLog(offer.sdp, 'info');
        
        // Modify SDP for better quality and compatibility
        if (offer.sdp) {
            offer.sdp = optimizeSDP(offer.sdp);
            debugLog('Optimized offer SDP:', 'info');
            debugLog(offer.sdp, 'info');
        }
        
        await peerConnection.setLocalDescription(offer);
        debugLog('Set local description with offer', 'info');

        // Step 4: Store call info in Firebase
        updateLoading(70, 'Setting up call channel');
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
        debugLog(`Call created in Firebase with ID: ${currentCallId}`, 'success');

        // Listen for answer/status changes on the outgoing call
        callEndedListener = onValue(callRef, async (snapshot) => {
            const callData = snapshot.val();
            debugLog(`Call state update received: ${callData?.status}`, 'info');
            
            if (!callData) {
                debugLog('Call data no longer exists in Firebase. Ending call locally.', 'warning');
                hangupCall();
                return;
            }

            if (callData.status === 'answered' && callData.answer && peerConnection.remoteDescription?.type !== 'answer') {
                debugLog('Received answer, setting remote description', 'info');
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
                    
                    // Modify answer SDP for better quality if needed
                    if (callData.answer.sdp) {
                        const optimizedAnswerSDP = optimizeSDP(callData.answer.sdp);
                        if (optimizedAnswerSDP !== callData.answer.sdp) {
                            debugLog('Optimizing answer SDP', 'info');
                            await peerConnection.setRemoteDescription({
                                type: 'answer',
                                sdp: optimizedAnswerSDP
                            });
                        }
                    }
                    
                    callStatus.textContent = 'Connected!';
                    hideLoading();
                    showSection('call-screen');
                } catch (error) {
                    debugLog(`Error setting remote description: ${error.message}`, 'error');
                    showAlert("Connection Error", "Failed to establish connection.", 'error');
                    hangupCall();
                }
            } else if (callData.status === 'rejected') {
                hideLoading();
                showAlert("Call Rejected", `${callData.calleeUsername} rejected your call.`, 'error');
                hangupCall();
            } else if (callData.status === 'no-answer') {
                hideLoading();
                showAlert("No Answer", `${callData.calleeUsername} did not answer.`, 'error');
                hangupCall();
            } else if (callData.status === 'ended' && callData.endedBy !== currentUser.uid) {
                hideLoading();
                showAlert("Call Ended", `${callData.endedByUsername || 'The other party'} ended the call.`, 'info');
                hangupCall();
            }
        });

        // Listen for ICE candidates from remote
        onChildAdded(child(callRef, 'candidates/' + targetContact.id), (snapshot) => {
            const candidate = snapshot.val();
            debugLog(`Received remote ICE candidate: ${candidate.candidate}`, 'info');
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(error => {
                    debugLog(`Failed to add ICE candidate: ${error.message}`, 'error');
                });
        });

        // Set call UI
        remoteUserDisplay.textContent = targetContact.username;
        callStatus.textContent = 'Ringing...';

        // Set a timeout for no answer (40 seconds)
        setTimeout(async () => {
            if (!currentCallId) return;
            
            const currentCallSnapshot = await get(callRef);
            if (currentCallSnapshot.exists() && currentCallSnapshot.val().status === 'ringing') {
                debugLog('Outgoing call timeout - no answer', 'warning');
                await update(callRef, { 
                    status: 'no-answer', 
                    endedBy: 'system',
                    endedAt: Date.now()
                });
            }
        }, 40000);

        hideLoading();
        showSection('call-screen');
    } catch (error) {
        console.error("[CALL ERROR] Error starting outgoing call:", error);
        hideLoading();
        showAlert("Call Error", `Failed to start call: ${error.message}`, 'error');
        hangupCall();
        debugLog(`Outgoing call error: ${error.message}`, 'error');
    }
}

// Optimize SDP for better call quality and compatibility
function optimizeSDP(sdp) {
    if (!sdp) return sdp;
    
    // Prefer opus audio codec with stereo and in-band FEC
    sdp = sdp.replace(/a=rtpmap:111 opus\/48000\/2\r\n/g, '');
    sdp = sdp.replace(/a=fmtp:111 minptime=10;useinbandfec=1\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:103 ISAC\/16000\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:104 ISAC\/32000\r\n/g, '');
    
    // Add opus settings if not present
    if (!sdp.includes('useinbandfec=1')) {
        sdp = sdp.replace(/a=fmtp:(.*) opus\/48000\/2/, 'a=fmtp:$1 stereo=1;useinbandfec=1');
    }
    
    // Remove CN (comfort noise) codecs
    sdp = sdp.replace(/a=rtpmap:13 CN\/8000\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:105 CN\/16000\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:106 CN\/32000\r\n/g, '');
    
    // Prefer VP8/VP9 over H264 for better compatibility
    sdp = sdp.replace(/a=rtpmap:100 VP8\/90000\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:101 VP9\/90000\r\n/g, '');
    sdp = sdp.replace(/a=rtpmap:102 H264\/90000\r\n/g, '');
    
    return sdp;
}

// Listen for incoming calls with better state handling
function listenForIncomingCalls() {
    if (!currentUser || !currentUser.uid) {
        debugLog('Not logged in, cannot listen for calls', 'warning');
        return;
    }

    const callsRef = ref(db, 'calls');
    
    // Detach any existing listener to prevent duplicates
    if (incomingCallListener) {
        off(callsRef, 'child_added', incomingCallListener);
        debugLog('Existing incoming call listener detached', 'info');
    }

    // Listen for new calls where this user is the callee
    incomingCallListener = onChildAdded(callsRef, async (snapshot) => {
        const callData = snapshot.val();
        const callId = snapshot.key;
        
        debugLog(`Incoming call check: ${callId} for ${callData?.calleeId}`, 'info');
        
        // Check if this call is actually for the current user and is ringing
        if (callData.calleeId === currentUser.uid && callData.status === 'ringing') {
            debugLog(`Incoming call detected from ${callData.callerUsername} (${callData.callerId})`, 'info');
            
            if (currentCallId) {
                // If already in a call or busy, reject new incoming call automatically
                debugLog('Already in a call, rejecting incoming call', 'warning');
                await update(ref(db, `calls/${callId}`), { 
                    status: 'rejected', 
                    endedBy: currentUser.uid, 
                    endedByUsername: currentUser.username,
                    endedAt: Date.now()
                });
                return;
            }

            // Set current call info
            currentCallId = callId;
            callRef = ref(db, `calls/${callId}`);
            callType = callData.type;
            
            // Update UI for incoming call
            incomingCallTitle.textContent = callData.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call';
            incomingCallerName.textContent = callData.callerUsername;
            incomingCallType.textContent = callData.type === 'video' ? 'Video Call' : 'Voice Call';
            
            // Start vibration pattern
            if ('vibrate' in navigator) {
                debugLog('Starting vibration for incoming call', 'info');
                vibrationInterval = setInterval(() => {
                    navigator.vibrate([500, 200, 500, 200]);
                }, 1400);
            }

            // Show incoming call screen
            showSection('incoming-call-screen');
            
            // Set timeout for no answer (40 seconds)
            incomingCallTimeoutId = setTimeout(async () => {
                const currentCallSnapshot = await get(callRef);
                if (currentCallSnapshot.exists() && currentCallSnapshot.val().status === 'ringing') {
                    debugLog('Incoming call timeout - no answer', 'warning');
                    await update(callRef, { 
                        status: 'no-answer', 
                        endedBy: 'system',
                        endedAt: Date.now()
                    });
                    hangupCall();
                    showAlert("Call Missed", `Missed call from ${callData.callerUsername}`, 'info');
                }
            }, 40000);

            // Set up answer/reject handlers
            answerCallBtn.onclick = async () => {
                clearTimeout(incomingCallTimeoutId);
                
                if (vibrationInterval) {
                    clearInterval(vibrationInterval);
                    if ('vibrate' in navigator) navigator.vibrate(0);
                    vibrationInterval = null;
                    debugLog('Vibration stopped on answer', 'info');
                }
                
                showLoading("Answering call...", "Setting up connection", 10);
                
                try {
                    // 1. Get local stream
                    updateLoading(20, 'Accessing media devices');
                    if (!await getLocalStream(callType === 'video')) {
                        await update(callRef, { 
                            status: 'rejected', 
                            endedBy: currentUser.uid,
                            endedByUsername: currentUser.username,
                            endedAt: Date.now()
                        });
                        hideLoading();
                        hangupCall();
                        return;
                    }

                    // 2. Create RTCPeerConnection
                    updateLoading(40, 'Establishing connection');
                    if (!createPeerConnection()) {
                        await update(callRef, { 
                            status: 'rejected', 
                            endedBy: currentUser.uid,
                            endedByUsername: currentUser.username,
                            endedAt: Date.now()
                        });
                        hideLoading();
                        hangupCall();
                        return;
                    }

                    // 3. Set remote offer (with SDP optimization)
                    updateLoading(60, 'Processing offer');
                    const optimizedOfferSDP = optimizeSDP(callData.offer.sdp);
                    await peerConnection.setRemoteDescription({
                        type: callData.offer.type,
                        sdp: optimizedOfferSDP
                    });
                    debugLog('Set remote description with optimized offer', 'info');

                    // 4. Create answer
                    updateLoading(80, 'Creating answer');
                    const answer = await peerConnection.createAnswer();
                    debugLog('Created answer:', 'info');
                    debugLog(answer.sdp, 'info');
                    
                    // Optimize answer SDP
                    answer.sdp = optimizeSDP(answer.sdp);
                    debugLog('Optimized answer SDP:', 'info');
                    debugLog(answer.sdp, 'info');
                    
                    await peerConnection.setLocalDescription(answer);
                    debugLog('Set local description with answer', 'info');

                    // 5. Update call in Firebase with answer and status
                    await update(callRef, {
                        answer: {
                            type: answer.type,
                            sdp: answer.sdp,
                        },
                        status: 'answered',
                        answeredAt: Date.now()
                    });
                    debugLog('Call answered and updated in Firebase', 'success');

                    // Listen for ICE candidates from remote (caller)
                    onChildAdded(child(callRef, 'candidates/' + callData.callerId), (snapshot) => {
                        const candidate = snapshot.val();
                        debugLog(`Received remote ICE candidate: ${candidate.candidate}`, 'info');
                        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                            .catch(error => {
                                debugLog(`Failed to add ICE candidate: ${error.message}`, 'error');
                            });
                    });

                    // Listen for the caller ending the call
                    callEndedListener = onValue(callRef, (snap) => {
                        const updatedCallData = snap.val();
                        if (!updatedCallData) {
                            debugLog('Call node removed, ending call locally', 'warning');
                            hangupCall();
                            return;
                        }
                        
                        if (updatedCallData.status === 'ended' || 
                            updatedCallData.status === 'no-answer' || 
                            updatedCallData.status === 'rejected') {
                            if (updatedCallData.endedBy !== currentUser.uid) {
                                showAlert("Call Ended", `${updatedCallData.endedByUsername || 'The other party'} ended the call.`, 'info');
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
                    showAlert("Call Error", `Failed to answer call: ${error.message}`, 'error');
                    
                    await update(callRef, { 
                        status: 'rejected', 
                        endedBy: currentUser.uid, 
                        endedByUsername: currentUser.username,
                        endedAt: Date.now()
                    });
                    
                    hangupCall();
                    debugLog(`Error answering call: ${error.message}`, 'error');
                }
            };

            rejectCallBtn.onclick = async () => {
                clearTimeout(incomingCallTimeoutId);
                
                if (vibrationInterval) {
                    clearInterval(vibrationInterval);
                    if ('vibrate' in navigator) navigator.vibrate(0);
                    vibrationInterval = null;
                    debugLog('Vibration stopped on reject', 'info');
                }
                
                debugLog('Call rejected by user', 'info');
                await update(callRef, { 
                    status: 'rejected', 
                    endedBy: currentUser.uid, 
                    endedByUsername: currentUser.username,
                    endedAt: Date.now()
                });
                
                hangupCall();
            };
        }
    });
    
    debugLog('Listening for incoming calls', 'info');
}

// Hang up the current call with comprehensive cleanup
async function hangupCall() {
    debugLog(`Hangup initiated for call ${currentCallId}`, 'info');
    
    // Stop all timers and vibrations first
    clearTimeout(incomingCallTimeoutId);
    incomingCallTimeoutId = null;
    
    if (vibrationInterval) {
        clearInterval(vibrationInterval);
        if ('vibrate' in navigator) navigator.vibrate(0);
        vibrationInterval = null;
        debugLog('Vibration stopped', 'info');
    }
    
    stopCallTimer();
    stopQualityMonitor();
    
    // Update Firebase if the call is still active
    if (callRef && currentCallId) {
        try {
            const currentCallSnapshot = await get(callRef);
            if (currentCallSnapshot.exists() && 
                currentCallSnapshot.val().status !== 'ended' && 
                currentCallSnapshot.val().status !== 'no-answer' && 
                currentCallSnapshot.val().status !== 'rejected') {
                
                debugLog('Updating Firebase call status to ended', 'info');
                await update(callRef, { 
                    status: 'ended', 
                    endedBy: currentUser?.uid || 'system',
                    endedByUsername: currentUser?.username || 'System',
                    endedAt: Date.now()
                });
            }
        } catch (error) {
            debugLog(`Error updating call status: ${error.message}`, 'error');
        }
    }
    
    // Clean up PeerConnection
    if (peerConnection) {
        try {
            // Close all data channels first
            if (peerConnection.getDataChannels) {
                peerConnection.getDataChannels().forEach(channel => {
                    channel.close();
                    debugLog(`Data channel ${channel.label} closed`, 'info');
                });
            }
            
            // Close the connection
            peerConnection.close();
            debugLog('PeerConnection closed', 'info');
        } catch (error) {
            debugLog(`Error closing PeerConnection: ${error.message}`, 'error');
        } finally {
            peerConnection = null;
        }
    }
    
    // Clean up media streams
    stopLocalStream();
    
    if (remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        debugLog('Remote stream stopped', 'info');
    }
    
    remoteVideo.style.display = 'none';
    callStatus.textContent = '';
    remoteUserDisplay.textContent = '';
    callStats.classList.add('hidden');
    
    // Reset current call state
    currentCallId = null;
    callRef = null;
    callType = null;
    
    // Reset control states
    isMicMuted = false;
    isVideoOff = false;
    isSpeakerOn = true;
    updateCallUI();
    
    // Return to contacts list
    showSection('calls-contacts-section');
    debugLog('Call completely cleaned up', 'info');
    
    // Detach any remaining listeners
    if (callEndedListener) {
        off(callRef, 'value', callEndedListener);
        callEndedListener = null;
        debugLog('Call ended listener detached', 'info');
    }
}

// Update call UI controls
function updateCallUI() {
    // Mic button
    if (isMicMuted) {
        toggleMicBtn.classList.add('off');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        toggleMicBtn.classList.remove('off');
        toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }

    // Video button
    if (isVideoOff || callType !== 'video') {
        toggleVideoBtn.classList.add('off');
        toggleVideoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        localVideo.style.opacity = '0.5';
    } else {
        toggleVideoBtn.classList.remove('off');
        toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';
        localVideo.style.opacity = '1';
    }
    
    // Speaker button
    if (isSpeakerOn) {
        toggleSpeakerBtn.classList.remove('off');
        toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        toggleSpeakerBtn.classList.add('off');
        toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
    
    // Set audio output if supported
    if (remoteVideo.setSinkId && isSpeakerOn) {
        remoteVideo.setSinkId('default')
            .catch(error => {
                debugLog(`Error setting audio output: ${error.message}`, 'error');
            });
    }
    
    debugLog(`UI updated: Mic ${isMicMuted ? 'muted' : 'unmuted'}, Video ${isVideoOff ? 'off' : 'on'}, Speaker ${isSpeakerOn ? 'on' : 'off'}`, 'info');
}

// Event Listeners for Call Controls
toggleMicBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            isMicMuted = !track.enabled;
            updateCallUI();
            debugLog(`Mic ${isMicMuted ? 'muted' : 'unmuted'}`, 'info');
        });
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (localStream && callType === 'video') {
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
            isVideoOff = !track.enabled;
            updateCallUI();
            debugLog(`Video ${isVideoOff ? 'disabled' : 'enabled'}`, 'info');
        });
    }
});

toggleSpeakerBtn.addEventListener('click', () => {
    isSpeakerOn = !isSpeakerOn;
    updateCallUI();
    debugLog(`Speaker ${isSpeakerOn ? 'enabled' : 'disabled'}`, 'info');
});

hangupBtn.addEventListener('click', hangupCall);

// Debug panel controls
toggleDebugBtn.addEventListener('click', toggleDebugPanel);
showDebugBtn.addEventListener('click', toggleDebugPanel);

// Toggle call stats on double tap (for mobile)
callScreen.addEventListener('dblclick', () => {
    callStats.classList.toggle('hidden');
    debugLog(`Call stats ${callStats.classList.contains('hidden') ? 'hidden' : 'shown'}`, 'info');
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen initially
    showLoading('Initializing ThunderChat Calls', 'Loading components', 5);
    
    // Set up alert modal buttons
    customAlertOkBtn.addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
        debugLog('Alert modal closed by OK button', 'info');
    });
    
    closeAlertBtn.addEventListener('click', () => {
        customAlertModal.classList.remove('show-modal');
        customAlertModal.classList.add('hidden');
        debugLog('Alert modal closed by X button', 'info');
    });
    
    // Simulate loading progress (in a real app, this would be actual progress)
    setTimeout(() => updateLoading(20, 'Checking authentication'), 500);
    setTimeout(() => updateLoading(40, 'Loading UI components'), 1000);
    setTimeout(() => updateLoading(60, 'Connecting to services'), 1500);
    setTimeout(() => updateLoading(80, 'Almost ready'), 2000);
    setTimeout(() => updateLoading(100, 'Done'), 2500);
    
    debugLog('Application initialized', 'success');
});
