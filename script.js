import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
    getDatabase, ref, push, set, onValue, update, remove, get
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ✅ Firebase project configuration with explicit Realtime Database URL
const firebaseConfig = {
    apiKey: "AIzaSyBs46VM5zgp0vcfJDQNpoDZqgaU3W1hpRQ",
    authDomain: "myapp-c5fd7.firebaseapp.com",
    databaseURL: "https://myapp-c5fd7-default-rtdb.firebaseio.com",
    projectId: "myapp-c5fd7",
    storageBucket: "myapp-c5fd7.firebasestorage.app",
    messagingSenderId: "830471805250",
    appId: "1:830471805250:web:94fbd40e1f3913a6b610db",
    measurementId: "G-5BZMHTF3GF"
};

// Initialize Firebase safely
let firebaseApp = null;
let analytics = null;
let db = null;
try {
    firebaseApp = initializeApp(firebaseConfig);
    analytics = getAnalytics(firebaseApp);
    db = getDatabase(firebaseApp);
} catch (e) {
    console.warn("Firebase SDK initialization notice:", e);
}

// Storage Keys
const STORAGE_KEYS = {
    USER_ID: 'ktm_app_user_id',
    USERS_LOCAL: 'ktm_app_users_store',
    BOOKINGS_LOCAL: 'ktm_app_bookings_store'
};

// Safe asynchronous helper with timeout to prevent Firebase promises from hanging
const withTimeout = (promise, ms = 3000, fallbackErrorMsg = 'Operation timed out') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(fallbackErrorMsg)), ms))
    ]);
};

// Resilient Offline-First Local Store
const localStore = {
    getUsers: () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_LOCAL) || '{}');
        } catch (e) {
            return {};
        }
    },
    saveUser: (user) => {
        try {
            const users = localStore.getUsers();
            users[user.id] = user;
            localStorage.setItem(STORAGE_KEYS.USERS_LOCAL, JSON.stringify(users));
        } catch (e) {
            console.error("Local user save failed", e);
        }
    },
    findUserByEmail: (email) => {
        const users = localStore.getUsers();
        const clean = (email || '').trim().toLowerCase();
        for (const id in users) {
            if ((users[id].email || '').trim().toLowerCase() === clean) {
                return { id, ...users[id] };
            }
        }
        return null;
    },
    getUserById: (id) => {
        const users = localStore.getUsers();
        return users[id] ? { id, ...users[id] } : null;
    },
    updateUser: (id, updates) => {
        try {
            const users = localStore.getUsers();
            if (users[id]) {
                users[id] = { ...users[id], ...updates };
                localStorage.setItem(STORAGE_KEYS.USERS_LOCAL, JSON.stringify(users));
                return users[id];
            }
        } catch (e) {
            console.error("Local user update failed", e);
        }
        return null;
    },
    getBookings: (userId) => {
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS_LOCAL) || '{}');
            return all[userId] || [];
        } catch (e) {
            return [];
        }
    },
    saveBooking: (userId, booking) => {
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS_LOCAL) || '{}');
            if (!all[userId]) all[userId] = [];
            // Prepend new booking
            all[userId].unshift(booking);
            localStorage.setItem(STORAGE_KEYS.BOOKINGS_LOCAL, JSON.stringify(all));
        } catch (e) {
            console.error("Local booking save failed", e);
        }
    },
    removeBooking: (userId, bookingId) => {
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS_LOCAL) || '{}');
            if (all[userId]) {
                all[userId] = all[userId].filter(b => b.id !== bookingId);
                localStorage.setItem(STORAGE_KEYS.BOOKINGS_LOCAL, JSON.stringify(all));
            }
        } catch (e) {
            console.error("Local booking remove failed", e);
        }
    }
};

// Global App Object
window.app = {
    state: {
        user: null,
        currentCategory: null,
        selectedPlace: null,
        bookings: [],
        firebaseStatus: 'checking' // 'active' | 'deactivated' | 'permission_denied' | 'offline'
    },

    init: async () => {
        // 1. Session Restoration: Check local store first for instant UI response
        const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);

        if (storedUserId) {
            const localUser = localStore.getUserById(storedUserId);
            if (localUser) {
                app.state.user = localUser;
                app.showAuthenticatedApp(localUser);
                app.loadBookings();
            } else {
                // If not in localStore, attempt to fetch from Firebase with timeout
                try {
                    if (db) {
                        const userRef = ref(db, 'users/' + storedUserId);
                        const snapshot = await withTimeout(get(userRef), 2500);
                        if (snapshot.exists()) {
                            const user = snapshot.val();
                            user.id = storedUserId;
                            localStore.saveUser(user);
                            app.state.user = user;
                            app.showAuthenticatedApp(user);
                            app.loadBookings();
                        } else {
                            localStorage.removeItem(STORAGE_KEYS.USER_ID);
                            app.showView('login');
                        }
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.USER_ID);
                        app.showView('login');
                    }
                } catch (e) {
                    console.warn("Session restore from Firebase timed out or failed:", e.message);
                    localStorage.removeItem(STORAGE_KEYS.USER_ID);
                    app.showView('login');
                }
            }
        } else {
            app.state.user = null;
            app.showView('login');
        }

        // 2. Setup Form Listeners
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', app.handleLogin);

        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.addEventListener('submit', app.handleSignup);

        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) editProfileForm.addEventListener('submit', app.saveProfile);

        // 3. Search Listener
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => app.handleSearch(e.target.value));
        }

        // 4. Initial Renders
        app.renderPopular();

        // 5. Firebase Diagnostics Check
        app.checkFirebaseHealth();
    },

    // --- Firebase Diagnostics & Health Check ---
    checkFirebaseHealth: async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch('https://myapp-c5fd7-default-rtdb.firebaseio.com/.json?shallow=true', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.status === 200) {
                app.state.firebaseStatus = 'active';
            } else if (res.status === 423) {
                app.state.firebaseStatus = 'deactivated';
            } else if (res.status === 401 || res.status === 403) {
                app.state.firebaseStatus = 'permission_denied';
            } else {
                app.state.firebaseStatus = 'error';
            }
        } catch (e) {
            app.state.firebaseStatus = 'offline';
        }

        app.updateFirebaseStatusUI();
    },

    updateFirebaseStatusUI: () => {
        const status = app.state.firebaseStatus;
        const bannerElements = document.querySelectorAll('.firebase-status-banner');
        const statusTextElements = document.querySelectorAll('.firebase-status-text');
        const dots = document.querySelectorAll('.status-dot');
        const dotsSm = document.querySelectorAll('.status-dot-sm');

        let text = 'Firebase: Active & Connected';
        let bannerClass = 'status-active';
        let dotClass = 'active';
        let badgeText = 'Active (Online)';
        let badgeClass = 'active';
        let detailMsg = 'Realtime Database is active and syncing smoothly.';

        if (status === 'deactivated') {
            text = 'Firebase RTDB: Deactivated (Running in Local Mode - Click for Fix)';
            bannerClass = 'status-deactivated';
            dotClass = 'deactivated';
            badgeText = 'Deactivated (HTTP 423)';
            badgeClass = 'deactivated';
            detailMsg = 'Firebase has deactivated this database due to inactivity. Reactivate it in Firebase Console to enable cloud sync.';
        } else if (status === 'permission_denied') {
            text = 'Firebase: Rules Locked (Running in Local Mode - Click for Fix)';
            bannerClass = 'status-error';
            dotClass = 'deactivated';
            badgeText = 'Permission Denied';
            badgeClass = 'deactivated';
            detailMsg = 'Database security rules are set to read/write: false. Update rules to true in Firebase Console.';
        } else if (status === 'offline') {
            text = 'Firebase: Offline / Timed out (Running in Local Mode)';
            bannerClass = 'status-error';
            dotClass = 'deactivated';
            badgeText = 'Offline / Timeout';
            badgeClass = 'local';
            detailMsg = 'Unable to reach Firebase. The app is running smoothly using offline local storage.';
        } else if (status === 'checking') {
            text = 'Checking Firebase database status...';
            bannerClass = '';
            dotClass = '';
            badgeText = 'Checking...';
            badgeClass = 'local';
            detailMsg = 'Testing connection to Firebase Realtime Database...';
        }

        bannerElements.forEach(b => {
            b.className = `firebase-status-banner ${bannerClass}`;
        });

        statusTextElements.forEach(t => {
            t.textContent = text;
        });

        dots.forEach(d => {
            d.className = `status-dot ${dotClass}`;
        });

        dotsSm.forEach(d => {
            d.className = `status-dot-sm ${dotClass}`;
        });

        const modalBadge = document.getElementById('modal-status-badge');
        if (modalBadge) {
            modalBadge.textContent = badgeText;
            modalBadge.className = `status-badge ${badgeClass}`;
        }

        const modalMsg = document.getElementById('modal-status-msg');
        if (modalMsg) {
            modalMsg.textContent = detailMsg;
        }
    },

    openFirebaseModal: () => {
        const modal = document.getElementById('firebase-status-modal');
        if (modal) {
            modal.classList.remove('hidden');
            app.updateFirebaseStatusUI();
        }
    },

    testFirebaseLive: async () => {
        const btn = document.getElementById('retest-firebase-btn');
        const modalBadge = document.getElementById('modal-status-badge');
        const modalMsg = document.getElementById('modal-status-msg');

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
            btn.disabled = true;
        }
        if (modalBadge) {
            modalBadge.textContent = 'Testing...';
            modalBadge.className = 'status-badge local';
        }
        if (modalMsg) {
            modalMsg.textContent = 'Pinging Firebase Realtime Database endpoint...';
        }

        await app.checkFirebaseHealth();

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Test Connection';
            btn.disabled = false;
        }

        if (app.state.firebaseStatus === 'active') {
            app.showToast("🟢 Firebase is Active and Connected!");
        } else if (app.state.firebaseStatus === 'deactivated') {
            app.showToast("⚠️ Firebase is Deactivated. Please reactivate in Firebase Console.");
        } else {
            app.showToast("Local storage mode active. Follow steps to configure Firebase.");
        }
    },

    // --- Authentication Handlers (Hybrid: Firebase + Local Storage) ---
    handleSignup: async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const btn = e.target.querySelector('button');

        const name = (nameInput.value || '').trim();
        const email = (emailInput.value || '').trim().toLowerCase();
        const password = passwordInput.value;

        if (!name) {
            alert("Please enter your name.");
            return;
        }
        if (!email || !email.includes('@')) {
            alert("Please enter a valid email address.");
            return;
        }
        if (!password || password.length < 4) {
            alert("Password must be at least 4 characters long.");
            return;
        }

        btn.textContent = 'Creating Account...';
        btn.disabled = true;

        try {
            // 1. Check if email already registered locally
            if (localStore.findUserByEmail(email)) {
                alert("This email is already registered! Please sign in with your password.");
                btn.textContent = 'Sign Up';
                btn.disabled = false;
                return;
            }

            // 2. Check Firebase (with safe timeout) if accessible
            let emailExistsInFirebase = false;
            let firebaseUsersRef = null;
            let generatedFirebaseKey = null;

            if (db && app.state.firebaseStatus !== 'deactivated') {
                try {
                    firebaseUsersRef = ref(db, 'users');
                    const snapshot = await withTimeout(get(firebaseUsersRef), 3000);
                    if (snapshot.exists()) {
                        const users = snapshot.val();
                        emailExistsInFirebase = Object.values(users).some(
                            u => (u.email || '').trim().toLowerCase() === email
                        );
                    }
                } catch (fbErr) {
                    console.warn("Firebase check during signup skipped/timed out:", fbErr.message);
                }
            }

            if (emailExistsInFirebase) {
                alert("This email is already registered! Please sign in.");
                btn.textContent = 'Sign Up';
                btn.disabled = false;
                return;
            }

            // 3. Generate User ID
            const userId = 'usr_' + Date.now();
            const newUser = {
                id: userId,
                displayName: name,
                email: email,
                password: password,
                createdAt: new Date().toISOString()
            };

            // 4. Save to Local Storage immediately
            localStore.saveUser(newUser);

            // 5. Try syncing to Firebase in background if online
            if (db && app.state.firebaseStatus === 'active') {
                try {
                    await withTimeout(set(ref(db, 'users/' + userId), newUser), 3500);
                } catch (saveErr) {
                    console.warn("Firebase sync notice:", saveErr.message);
                }
            }

            // 6. Establish Session
            localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
            app.state.user = newUser;

            // 7. Reset Form & Navigate
            document.getElementById('signup-form').reset();
            app.showAuthenticatedApp(newUser);
            app.loadBookings();

            if (app.state.firebaseStatus === 'deactivated') {
                app.showToast(`Account created! (Saved locally while Firebase is deactivated)`);
            } else {
                app.showToast(`Welcome, ${name}! Account created successfully.`);
            }

        } catch (error) {
            console.error("Signup Error", error);
            alert("Signup failed: " + error.message);
        } finally {
            btn.textContent = 'Sign Up';
            btn.disabled = false;
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const btn = e.target.querySelector('button');

        const email = (emailInput.value || '').trim().toLowerCase();
        const password = passwordInput.value;

        if (!email) {
            alert("Please enter your email.");
            return;
        }
        if (!password) {
            alert("Please enter your password.");
            return;
        }

        btn.textContent = 'Signing In...';
        btn.disabled = true;

        try {
            let matchedUser = null;
            let matchedUserId = null;

            // 1. First check local store (instant match)
            const localMatch = localStore.findUserByEmail(email);
            if (localMatch) {
                matchedUser = localMatch;
                matchedUserId = localMatch.id;
            }

            // 2. If not found locally and Firebase is active/available, check Firebase with timeout
            if (!matchedUser && db && app.state.firebaseStatus !== 'deactivated') {
                try {
                    const usersRef = ref(db, 'users');
                    const snapshot = await withTimeout(get(usersRef), 3500);
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        for (const key in data) {
                            if ((data[key].email || '').trim().toLowerCase() === email) {
                                matchedUser = data[key];
                                matchedUserId = key;
                                // Cache locally for fast offline access
                                localStore.saveUser({ id: key, ...matchedUser });
                                break;
                            }
                        }
                    }
                } catch (fbErr) {
                    console.warn("Firebase check during login timed out/failed:", fbErr.message);
                }
            }

            // 3. Evaluate credentials
            if (matchedUser) {
                if (matchedUser.password === password) {
                    localStorage.setItem(STORAGE_KEYS.USER_ID, matchedUserId);
                    matchedUser.id = matchedUserId;
                    app.state.user = matchedUser;

                    document.getElementById('login-form').reset();
                    app.showAuthenticatedApp(matchedUser);
                    app.loadBookings();
                    app.showToast(`Signed in as ${matchedUser.displayName || 'User'}`);
                } else {
                    alert("Incorrect password. Please try again.");
                }
            } else {
                alert(`No account found with email: ${email}\nPlease check your credentials or click "Sign Up" to create an account.`);
            }

        } catch (error) {
            console.error("Login Error", error);
            alert("Login failed: " + error.message);
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    },

    logout: () => {
        if (confirm("Are you sure you want to sign out?")) {
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
            app.state.user = null;
            app.state.bookings = [];
            app.showView('login');

            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.reset();
            const signupForm = document.getElementById('signup-form');
            if (signupForm) signupForm.reset();

            app.showToast("Signed out successfully.");
        }
    },

    // --- View Management ---
    showView: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`${viewId}-view`);
        if (target) target.classList.remove('hidden');
        const authApp = document.getElementById('authenticated-app');
        if (authApp) authApp.classList.add('hidden');
        app.updateFirebaseStatusUI();
    },

    showAuthenticatedApp: (user) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const authApp = document.getElementById('authenticated-app');
        if (authApp) authApp.classList.remove('hidden');

        const catView = document.getElementById('categories-view');
        if (catView) catView.classList.remove('hidden');

        const userDisplay = document.getElementById('user-display-name');
        if (userDisplay) {
            userDisplay.textContent = user.displayName || 'User';
        }

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const homeNav = document.querySelector('.nav-item[onclick*="home"]');
        if (homeNav) homeNav.classList.add('active');

        app.updateProfileUI(user);
        app.updateFirebaseStatusUI();
    },

    updateProfileUI: (user) => {
        if (!user) return;
        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.textContent = user.displayName || 'User';

        const emailEl = document.getElementById('profile-email');
        if (emailEl) emailEl.textContent = user.email || '';

        const inputName = document.getElementById('profile-input-name');
        if (inputName) inputName.textContent = user.displayName || 'User';

        const inputEmail = document.getElementById('profile-input-email');
        if (inputEmail) inputEmail.textContent = user.email || '';

        const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
        const imgEl = document.getElementById('profile-img');
        if (imgEl) {
            imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=D6E4FF&color=0056D2&size=128`;
        }
    },

    navTo: (viewName, navElement) => {
        const appViews = ['categories-view', 'appointments-view', 'listing-view', 'booking-view', 'success-view', 'profile-view'];
        appViews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (viewName === 'home') {
            const cat = document.getElementById('categories-view');
            if (cat) cat.classList.remove('hidden');
        } else if (viewName === 'appointments') {
            const appt = document.getElementById('appointments-view');
            if (appt) appt.classList.remove('hidden');
            app.renderBookings();
        } else if (viewName === 'profile') {
            const prof = document.getElementById('profile-view');
            if (prof) prof.classList.remove('hidden');
            app.updateProfileUI(app.state.user);
        }

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navElement) navElement.classList.add('active');
    },

    goBack: () => {
        const listing = document.getElementById('listing-view');
        const booking = document.getElementById('booking-view');

        if (booking && !booking.classList.contains('hidden')) {
            booking.classList.add('hidden');
            if (listing) listing.classList.remove('hidden');
        } else if (listing && !listing.classList.contains('hidden')) {
            listing.classList.add('hidden');
            const cat = document.getElementById('categories-view');
            if (cat) cat.classList.remove('hidden');
        }
    },

    goHome: () => {
        app.navTo('home', document.querySelector('.nav-item:first-child'));
    },

    // --- Search Logic ---
    handleSearch: (query) => {
        if (!query || !query.trim()) {
            const listing = document.getElementById('listing-view');
            if (listing && !listing.classList.contains('hidden')) {
                app.goHome();
            }
            return;
        }

        const lowerQuery = query.trim().toLowerCase();
        let results = [];
        if (typeof appData !== 'undefined') {
            Object.keys(appData).forEach(cat => {
                const matches = appData[cat].filter(place =>
                    place.name.toLowerCase().includes(lowerQuery) ||
                    place.location.toLowerCase().includes(lowerQuery)
                );
                matches.forEach(m => results.push({ ...m, category: cat }));
            });
        }

        app.renderListing(results, `Search: "${query.trim()}"`);
    },

    renderListing: (places, titleText) => {
        const listContainer = document.getElementById('places-list');
        const title = document.getElementById('listing-title');

        ['categories-view', 'appointments-view', 'profile-view'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        const listing = document.getElementById('listing-view');
        if (listing) listing.classList.remove('hidden');

        if (title) title.textContent = titleText;
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (!places || places.length === 0) {
            listContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding: 30px; color:#888;">No results found.</div>';
            return;
        }

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.onclick = () => app.startBooking(place);
            const catDisplay = place.category ? place.category.charAt(0).toUpperCase() + place.category.slice(1) : 'Service';

            card.innerHTML = `
                <img src="${place.image}" alt="${place.name}" class="place-img" loading="lazy">
                <div class="place-info">
                    <div class="place-category">${catDisplay}</div>
                    <div class="place-name">${place.name}</div>
                    <div class="place-location"><i class="fa-solid fa-map-marker-alt"></i> ${place.location}</div>
                    <div class="rating-badge"><i class="fa-solid fa-star"></i> ${place.rating}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    },

    showCategory: (category) => {
        app.state.currentCategory = category;
        if (typeof appData !== 'undefined' && appData[category]) {
            const placeList = appData[category].map(p => ({ ...p, category: category }));
            app.renderListing(placeList, category.charAt(0).toUpperCase() + category.slice(1));
        }
    },

    // --- Popular Render ---
    renderPopular: () => {
        if (typeof appData === 'undefined') return;
        const container = document.getElementById('popular-list');
        if (!container) return;

        const popularList = [
            { ...(appData.hospital ? appData.hospital[0] : {}), type: 'Hospital', category: 'hospital' },
            { ...(appData.saloon ? appData.saloon[0] : {}), type: 'Saloon', category: 'saloon' },
            { ...(appData.parlour ? appData.parlour[0] : {}), type: 'Parlour', category: 'parlour' }
        ].filter(p => p.name);

        container.innerHTML = '';
        popularList.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.onclick = () => app.startBooking(place);
            card.innerHTML = `
                <img src="${place.image}" alt="${place.name}" class="place-img" loading="lazy">
                <div class="place-info">
                    <div class="place-category">${place.type}</div>
                    <div class="place-name">${place.name}</div>
                    <div class="place-location"><i class="fa-solid fa-map-marker-alt"></i> ${place.location}</div>
                    <div class="rating-badge"><i class="fa-solid fa-star"></i> ${place.rating}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // --- Booking Logic (Hybrid: Firebase + Local Storage) ---
    startBooking: (place) => {
        app.state.selectedPlace = place;
        const listing = document.getElementById('listing-view');
        if (listing) listing.classList.add('hidden');
        const booking = document.getElementById('booking-view');
        if (booking) booking.classList.remove('hidden');

        const detailsContainer = document.getElementById('booking-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                 <div class="place-card" style="box-shadow: none; padding: 0; background: transparent; border: none;">
                    <img src="${place.image}" alt="${place.name}" class="place-img">
                    <div class="place-info">
                        <div class="place-name">${place.name}</div>
                        <div class="place-location"><i class="fa-solid fa-map-marker-alt"></i> ${place.location}</div>
                        <div class="rating-badge"><i class="fa-solid fa-star"></i> ${place.rating}</div>
                    </div>
                </div>
                <hr style="margin-top: 20px; border: 0; border-top: 1px solid var(--border-color);">
            `;
        }

        const nameInput = document.getElementById('book-name');
        if (nameInput && app.state.user?.displayName) {
            nameInput.value = app.state.user.displayName;
        }
    },

    submitBooking: async (e) => {
        e.preventDefault();
        if (!app.state.user) return alert("Please log in to book an appointment.");

        const date = document.getElementById('book-date').value;
        const time = document.getElementById('book-time').value;
        const name = document.getElementById('book-name').value;
        const phone = document.getElementById('book-phone').value;

        if (!date || !time) return alert('Please select both date and time.');

        const bookingId = 'bk_' + Date.now();
        const bookingData = {
            id: bookingId,
            place: app.state.selectedPlace,
            date,
            time,
            userName: name,
            userPhone: phone,
            status: 'Confirmed',
            user_id: app.state.user.id,
            createdAt: new Date().toISOString()
        };

        const btn = e.target.querySelector('button');
        btn.textContent = 'Confirming...';
        btn.disabled = true;

        try {
            // 1. Save locally first
            localStore.saveBooking(app.state.user.id, bookingData);

            // 2. Update state & UI
            app.state.bookings.unshift(bookingData);

            // 3. Attempt to save to Firebase if online
            if (db && app.state.firebaseStatus === 'active') {
                try {
                    await withTimeout(set(ref(db, `bookings/${app.state.user.id}/${bookingId}`), bookingData), 3000);
                } catch (fbErr) {
                    console.warn("Firebase booking sync notice:", fbErr.message);
                }
            }

            // 4. Show success screen
            document.getElementById('booking-view').classList.add('hidden');
            document.getElementById('success-view').classList.remove('hidden');
            document.getElementById('booking-form').reset();
            app.showToast("Appointment successfully booked!");

        } catch (error) {
            console.error("Booking Error", error);
            alert("Booking failed: " + error.message);
        } finally {
            btn.textContent = 'Confirm Booking';
            btn.disabled = false;
        }
    },

    loadBookings: () => {
        if (!app.state.user) return;

        // 1. Load locally for instant display
        const localList = localStore.getBookings(app.state.user.id);
        app.state.bookings = localList;
        app.renderBookings();

        // 2. Sync with Firebase if online
        if (db && app.state.firebaseStatus === 'active') {
            try {
                const userBookingsRef = ref(db, 'bookings/' + app.state.user.id);
                onValue(userBookingsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const fbList = [];
                        Object.keys(data).forEach(key => {
                            fbList.push({ id: key, ...data[key] });
                        });
                        fbList.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                        app.state.bookings = fbList;
                        app.renderBookings();
                    }
                }, (error) => {
                    console.warn("Bookings listener notice:", error.message);
                });
            } catch (err) {
                console.warn("Failed to attach Firebase bookings listener:", err.message);
            }
        }
    },

    renderBookings: () => {
        const container = document.getElementById('my-booking-list');
        if (!container) return;

        const bookings = app.state.bookings || [];

        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: var(--text-secondary);">No appointments booked yet.</div>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'place-card';

            const dateObj = new Date(booking.date);
            const day = isNaN(dateObj.getDate()) ? '📅' : dateObj.getDate();
            const month = isNaN(dateObj.getDate()) ? '' : dateObj.toLocaleString('default', { month: 'short' });

            const placeName = booking.place ? booking.place.name : 'Appointment';
            const placeLocation = booking.place ? booking.place.location : '';

            card.innerHTML = `
                <div style="background-color: var(--primary-color); color: white; width: 60px; height: 60px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0;">
                    <span>${day}</span>
                    <span style="font-weight: 400; font-size: 10px;">${month}</span>
                </div>
                <div class="place-info">
                    <div class="place-name">${placeName}</div>
                    <div class="place-location">${booking.time} • <span style="color: var(--success-color); font-weight:600;">${booking.status}</span></div>
                    ${placeLocation ? `<div style="font-size: 11px; color: var(--text-secondary);"><i class="fa-solid fa-map-marker-alt"></i> ${placeLocation}</div>` : ''}
                </div>
                <button class="cancel-booking-btn" onclick="app.cancelBooking('${booking.id}')">Cancel</button>
            `;
            container.appendChild(card);
        });
    },

    cancelBooking: async (bookingId) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;

        // 1. Remove from local store
        localStore.removeBooking(app.state.user.id, bookingId);

        // 2. Remove from state & re-render
        app.state.bookings = app.state.bookings.filter(b => b.id !== bookingId);
        app.renderBookings();
        app.showToast("Appointment cancelled.");

        // 3. Remove from Firebase if active
        if (db && app.state.firebaseStatus === 'active') {
            try {
                await withTimeout(remove(ref(db, `bookings/${app.state.user.id}/${bookingId}`)), 3000);
            } catch (err) {
                console.warn("Firebase cancel booking notice:", err.message);
            }
        }
    },

    // --- Profile & Settings Handlers ---
    openEditProfile: () => {
        if (!app.state.user) return;
        const nameInput = document.getElementById('edit-name');
        const emailInput = document.getElementById('edit-email');
        if (nameInput) nameInput.value = app.state.user.displayName || '';
        if (emailInput) emailInput.value = app.state.user.email || '';

        const modal = document.getElementById('edit-profile-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeModal: (modalId = 'edit-profile-modal') => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    saveProfile: async (e) => {
        e.preventDefault();
        const newName = (document.getElementById('edit-name').value || '').trim();
        const newEmail = (document.getElementById('edit-email').value || '').trim().toLowerCase();
        const btn = e.target.querySelector('button[type="submit"]');

        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            // Update local store
            localStore.updateUser(app.state.user.id, {
                displayName: newName,
                email: newEmail
            });

            // Update state & UI
            app.state.user.displayName = newName;
            app.state.user.email = newEmail;
            app.updateProfileUI(app.state.user);

            const greeting = document.getElementById('user-display-name');
            if (greeting) greeting.textContent = newName;

            // Update in Firebase if active
            if (db && app.state.firebaseStatus === 'active') {
                try {
                    await withTimeout(update(ref(db, 'users/' + app.state.user.id), {
                        displayName: newName,
                        email: newEmail
                    }), 3000);
                } catch (fbErr) {
                    console.warn("Firebase profile update notice:", fbErr.message);
                }
            }

            app.closeModal('edit-profile-modal');
            app.showToast("Profile updated successfully!");

        } catch (error) {
            console.error("Profile Update Error", error);
            alert("Failed to update profile: " + error.message);
        } finally {
            btn.textContent = 'Save';
            btn.disabled = false;
        }
    },

    openSettings: () => {
        app.openFirebaseModal();
    },

    openHelp: () => {
        alert("KTM Bookings App v1.3\nHybrid Realtime & Offline Architecture");
    },

    // --- Toast Notifications ---
    showToast: (message, duration = 3000) => {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');

        if (window._toastTimeout) clearTimeout(window._toastTimeout);
        window._toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }
};

// Safe DOM initialization (works even if DOM is already parsed in ES module)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
