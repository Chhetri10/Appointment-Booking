import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
    getDatabase, ref, push, set, onValue, update, remove, query, orderByChild, equalTo, get
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ✅ Your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBs46VM5zgp0vcfJDQNpoDZqgaU3W1hpRQ",
    authDomain: "myapp-c5fd7.firebaseapp.com",
    projectId: "myapp-c5fd7",
    storageBucket: "myapp-c5fd7.firebasestorage.app",
    messagingSenderId: "830471805250",
    appId: "1:830471805250:web:94fbd40e1f3913a6b610db",
    measurementId: "G-5BZMHTF3GF"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const db = getDatabase(firebaseApp);

// Local Storage Keys - ONLY strictly for session persistence (current logged in user ID), not data
const STORAGE_KEYS = {
    USER_ID: 'ktm_app_user_id'
};

// Global App Object
window.app = {
    state: {
        user: null, 
        currentCategory: null,
        selectedPlace: null,
        bookings: []
    },

    init: async () => {
        // Check Local Storage for Auth ID
        const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);

        if (storedUserId) {
            // Fetch user details from Firebase
            const userRef = ref(db, 'users/' + storedUserId);
            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const user = snapshot.val();
                    // Add ID to user object for internal use
                    user.id = storedUserId;
                    app.state.user = user;
                    app.showAuthenticatedApp(user);
                    // Load bookings listener
                    app.loadBookings();
                } else {
                    // User ID in local storage but not in DB? Logout.
                    app.logout();
                }
            } catch (e) {
                console.error("Auth Load Error", e);
                app.showView('login');
            }
        } else {
            app.state.user = null;
            app.showView('login');
        }

        // Setup Forms
        document.getElementById('login-form').addEventListener('submit', app.handleLogin);
        document.getElementById('signup-form').addEventListener('submit', app.handleSignup);
        document.getElementById('edit-profile-form').addEventListener('submit', app.saveProfile);

        // Search Listener
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => app.handleSearch(e.target.value));
        }

        // Initial Renders
        app.renderPopular();
        // app.setupProfileButtons(); // Removed for new design
    },

    // --- Auth Handlers (FIREBASE) ---
    handleSignup: async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value; // stored but not encrypted in this demo
        const btn = e.target.querySelector('button');

        btn.textContent = 'Creating Account...';
        btn.disabled = true;

        try {
            // Check if email already exists - Fetch all users and filter client-side to avoid Index Rule requirement
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);

            let emailExists = false;
            if (snapshot.exists()) {
                const users = snapshot.val();
                emailExists = Object.values(users).some(u => u.email === email);
            }

            if (emailExists) {
                alert("Email already registered!");
                btn.textContent = 'Sign Up';
                btn.disabled = false;
                return;
            }

            // Create new user (Generate ID)
            const newUserRef = push(usersRef);
            const newUser = {
                displayName: name,
                email: email,
                password: password, // Note: In production, NEVER store plain passwords.
                createdAt: new Date().toISOString()
            };

            await set(newUserRef, newUser);

            // Save session
            const userId = newUserRef.key;
            localStorage.setItem(STORAGE_KEYS.USER_ID, userId);

            // Update state
            newUser.id = userId;
            app.state.user = newUser;
            app.showAuthenticatedApp(newUser);

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
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button');

        btn.textContent = 'Signing In...';
        btn.disabled = true;

        try {
            // Fetch all users to find match - avoiding Index Query
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);

            let user = null;
            let userId = null;

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Iterate keys to find matching email
                for (const key in data) {
                    if (data[key].email === email) {
                        user = data[key];
                        userId = key;
                        break;
                    }
                }
            }

            if (user) {
                // Simple password check
                if (user.password === password) {
                    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
                    user.id = userId;
                    app.state.user = user;
                    app.showAuthenticatedApp(user);
                    app.loadBookings();
                } else {
                    alert("Incorrect password");
                }
            } else {
                alert("User not found");
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
        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem(STORAGE_KEYS.USER_ID);
            app.state.user = null;
            app.state.bookings = []; // Clear bookings
            // Detach listeners if any? (Ideally yes, but app reload handles it for now)
            app.showView('login');
            // Optional: Clear form inputs
            document.getElementById('login-form').reset();
            document.getElementById('signup-form').reset();
        }
    },

    // --- View Management ---
    showView: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`${viewId}-view`);
        if (target) target.classList.remove('hidden');
        document.getElementById('authenticated-app').classList.add('hidden');
    },

    showAuthenticatedApp: (user) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById('authenticated-app').classList.remove('hidden');
        document.getElementById('categories-view').classList.remove('hidden');
        if (document.getElementById('user-display-name')) {
            document.getElementById('user-display-name').textContent = user.displayName || 'User';
        }
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.nav-item[onclick*="home"]').classList.add('active');
        app.updateProfileUI(user);
    },

    updateProfileUI: (user) => {
        if (!user) return;
        document.getElementById('profile-name').textContent = user.displayName || 'User';
        document.getElementById('profile-email').textContent = user.email;

        // Update new static fields
        if (document.getElementById('profile-input-name')) {
            document.getElementById('profile-input-name').textContent = user.displayName || 'User';
        }
        if (document.getElementById('profile-input-email')) {
            document.getElementById('profile-input-email').textContent = user.email;
        }

        const initial = user.displayName ? user.displayName.charAt(0) : 'U';
        document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${initial}&background=D6E4FF&color=0056D2&size=128`;
    },

    navTo: (viewName, navElement) => {
        const appViews = ['categories-view', 'appointments-view', 'listing-view', 'booking-view', 'success-view', 'profile-view'];
        appViews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        if (viewName === 'home') {
            document.getElementById('categories-view').classList.remove('hidden');
        } else if (viewName === 'appointments') {
            document.getElementById('appointments-view').classList.remove('hidden');
            // Bookings are auto-rendered via listener, but we can ensure refresh
            app.renderBookings();
        } else if (viewName === 'profile') {
            document.getElementById('profile-view')?.classList.remove('hidden');
            app.updateProfileUI(app.state.user);
        }

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navElement) navElement.classList.add('active');
    },

    goBack: () => {
        const listing = document.getElementById('listing-view');
        const booking = document.getElementById('booking-view');

        if (!booking.classList.contains('hidden')) {
            booking.classList.add('hidden');
            listing.classList.remove('hidden');
        } else if (!listing.classList.contains('hidden')) {
            listing.classList.add('hidden');
            document.getElementById('categories-view').classList.remove('hidden');
        }
    },

    goHome: () => {
        app.navTo('home', document.querySelector('.nav-item:first-child'));
    },

    // --- Search Logic ---
    handleSearch: (query) => {
        if (!query) {
            if (!document.getElementById('listing-view').classList.contains('hidden')) {
                app.goHome();
            }
            return;
        }

        const lowerQuery = query.toLowerCase();
        let results = [];
        Object.keys(appData).forEach(cat => {
            const matches = appData[cat].filter(place =>
                place.name.toLowerCase().includes(lowerQuery) ||
                place.location.toLowerCase().includes(lowerQuery)
            );
            matches.forEach(m => results.push({ ...m, category: cat }));
        });

        app.renderListing(results, `Search: "${query}"`);
    },

    renderListing: (places, titleText) => {
        const listContainer = document.getElementById('places-list');
        const title = document.getElementById('listing-title');

        document.getElementById('categories-view').classList.add('hidden');
        document.getElementById('appointments-view').classList.add('hidden');
        document.getElementById('profile-view').classList.add('hidden');
        document.getElementById('listing-view').classList.remove('hidden');

        title.textContent = titleText;
        listContainer.innerHTML = '';

        if (places.length === 0) {
            listContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding: 20px; color:#888;">No results found.</div>';
            return;
        }

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.onclick = () => app.startBooking(place);
            const catDisplay = place.category ? place.category.charAt(0).toUpperCase() + place.category.slice(1) : 'Service';

            card.innerHTML = `
                <img src="${place.image}" alt="${place.name}" class="place-img">
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
        const placeList = appData[category].map(p => ({ ...p, category: category }));
        app.renderListing(placeList, category.charAt(0).toUpperCase() + category.slice(1));
    },

    // --- Popular Render ---
    renderPopular: () => {
        const popularList = [
            { ...appData.hospital[0], type: 'Hospital' },
            { ...appData.saloon[0], type: 'Saloon' },
            { ...appData.parlour[0], type: 'Parlour' }
        ];

        const container = document.getElementById('popular-list');
        if (!container) return;

        container.innerHTML = '';
        popularList.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.innerHTML = `
                <img src="${place.image}" alt="${place.name}" class="place-img">
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

    // --- Booking Logic (FIREBASE) ---
    startBooking: (place) => {
        app.state.selectedPlace = place;
        document.getElementById('listing-view').classList.add('hidden');
        document.getElementById('booking-view').classList.remove('hidden');

        const detailsContainer = document.getElementById('booking-details-container');
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

        if (app.state.user?.displayName) {
            document.getElementById('book-name').value = app.state.user.displayName;
        }
    },

    submitBooking: async (e) => {
        e.preventDefault();
        if (!app.state.user) return alert("Please log in to book.");

        const date = document.getElementById('book-date').value;
        const time = document.getElementById('book-time').value;
        const name = document.getElementById('book-name').value;
        const phone = document.getElementById('book-phone').value;

        if (!date || !time) return alert('Please select date and time');

        const bookingData = {
            place: app.state.selectedPlace,
            date,
            time,
            userName: name,
            userPhone: phone,
            status: 'Confirmed',
            user_id: app.state.user.id, // Keeping for ref, but now implicitly structured
            createdAt: new Date().toISOString()
        };

        const btn = e.target.querySelector('button');
        btn.textContent = 'Booking...';
        btn.disabled = true;

        try {
            // Save to bookings/{userId}/{bookingId} to allow direct fetch without query index
            const userBookingsRef = ref(db, 'bookings/' + app.state.user.id);
            const newBookingRef = push(userBookingsRef);
            await set(newBookingRef, bookingData);

            document.getElementById('booking-view').classList.add('hidden');
            document.getElementById('success-view').classList.remove('hidden');
            document.getElementById('booking-form').reset();

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

        // Listen to bookings/{userId} directly
        const userBookingsRef = ref(db, 'bookings/' + app.state.user.id);

        onValue(userBookingsRef, (snapshot) => {
            const data = snapshot.val();
            app.state.bookings = [];

            if (data) {
                Object.keys(data).forEach(key => {
                    app.state.bookings.push({
                        id: key,
                        ...data[key]
                    });
                });
            }

            // Sort new to old
            app.state.bookings.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

            // Update UI
            if (document.getElementById('total-bookings-count')) {
                document.getElementById('total-bookings-count').textContent = app.state.bookings.length;
            }
            // If currently viewing appointments, refresh
            if (!document.getElementById('appointments-view').classList.contains('hidden')) {
                app.renderBookings();
            }
        });
    },

    renderBookings: () => {
        // Now purely pure render from app.state.bookings which is kept fresh by onValue
        const container = document.getElementById('my-booking-list');
        if (!container) return;

        const bookings = app.state.bookings;

        if (bookings.length === 0) {
            container.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: var(--text-secondary);">No appointments booked yet.</div>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.onclick = (e) => {
                if (e.target.closest('button')) return;
            };

            const dateObj = new Date(booking.date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('default', { month: 'short' });

            card.innerHTML = `
                <div style="background-color: var(--primary-color); color: white; width: 60px; height: 60px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
                    <span>${day}</span>
                    <span style="font-weight: 300; font-size: 10px;">${month}</span>
                </div>
                <div class="place-info">
                    <div class="place-name">${booking.place.name}</div>
                    <div class="place-location">${booking.time} • ${booking.status}</div>
                </div>
                <button class="cancel-booking-btn" onclick="app.cancelBooking('${booking.id}')">Cancel</button>
            `;
            container.appendChild(card);
        });
    },

    cancelBooking: async (bookingId) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;

        try {
            // Remove from bookings/{userId}/{bookingId}
            await remove(ref(db, `bookings/${app.state.user.id}/${bookingId}`));
            // Listener will update UI
        } catch (error) {
            alert("Failed to cancel: " + error.message);
        }
    },

    // --- Profile & Settings ---
    // Removed legacy setupProfileButtons as HTML is now static

    openEditProfile: () => {
        document.getElementById('edit-name').value = app.state.user.displayName;
        document.getElementById('edit-email').value = app.state.user.email;
        document.getElementById('edit-profile-modal').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('edit-profile-modal').classList.add('hidden');
    },

    saveProfile: async (e) => {
        e.preventDefault();
        const newName = document.getElementById('edit-name').value;
        const newEmail = document.getElementById('edit-email').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const userRef = ref(db, 'users/' + app.state.user.id);
            await update(userRef, {
                displayName: newName,
                email: newEmail
            });

            // Update local state is handled by success
            app.state.user.displayName = newName;
            app.state.user.email = newEmail;
            app.updateProfileUI(app.state.user);
            app.closeModal();
            alert("Profile Updated!");

        } catch (error) {
            console.error("Profile Update Error", error);
            alert("Failed to update profile: " + error.message);
        } finally {
            btn.textContent = 'Save';
            btn.disabled = false;
        }
    },

    openSettings: () => {
        alert("Settings feature coming soon!");
    },

    openHelp: () => {
        alert("KTM Bookings App v1.2\nConnected to Firebase");
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', app.init);
