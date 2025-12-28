/**
 * ZyroKart Authentication System
 * Handles Firebase Auth, User Profiles, and Session State
 */

const initAuth = () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const userMenu = document.getElementById('user-dropdown-menu');

    // Monitor Auth State
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in:", user.uid);
            updateUIForUser(user);
        } else {
            console.log("User logged out");
            updateUIForGuest();
        }
    });

    const updateUIForUser = async (user) => {
        const profileLink = document.getElementById('profile-link');
        const ordersLink = document.getElementById('orders-link');
        const logoutBtn = document.getElementById('logout-btn');
        const loginLink = document.getElementById('login-link');

        if(profileLink) profileLink.style.display = 'block';
        if(ordersLink) ordersLink.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(loginLink) loginLink.style.display = 'none';
        
        // Show welcome toast
        if(window.showToast) window.showToast(`Welcome back, ${user.displayName || 'User'}!`);
    };

    const updateUIForGuest = () => {
        const elements = ['profile-link', 'orders-link', 'logout-btn'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
        const loginLink = document.getElementById('login-link');
        if(loginLink) loginLink.style.display = 'block';
    };

    // Logout Function
    window.handleLogout = () => {
        auth.signOut().then(() => {
            window.location.reload();
        });
    };
};

document.addEventListener('DOMContentLoaded', initAuth);