/**
 * PROJECT MEMORY: Main Entry Point (v3.6 - Dynamic UI Injection)
 * Status: Production-Ready / Mobile-Hardened
 * Responsibility: Secure Auth, Global Patching, & Dynamic UI Injection.
 */

import { auth, db } from './firebase-config.js';
import { UIService } from './ui-service.js';
import { SecurityService } from './security-service.js';
import { FulfillmentService } from './fulfillment-service.js'; 
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. Global Navigation & Dynamic UI ---

/**
 * injectDynamicNavigation
 * Detects if user is in a subfolder and injects a "Back" button.
 */
const injectDynamicNavigation = () => {
    const path = window.location.pathname;
    const domain = "https://promptvaultusa.shop";
    
    // Check context
    const isVault = path.includes('/vault/');
    const isBlog = path.includes('/blog/') && !path.includes('trust-center.html');
    
    if (!isVault && !isBlog) return; // Exit if on main pages

    const backTarget = isVault 
        ? `${domain}/index.html?action=browse#browse` 
        : `${domain}/blog.html`;
        
    const label = isVault ? "Back to Vaults" : "Back to Blog";

    const navHTML = `
        <div id="dynamic-back-nav" style="position: fixed; top: 20px; left: 20px; z-index: 10001;">
            <a href="${backTarget}" style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 10px 18px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 8px 20px rgba(0,0,0,0.4); transition: 0.3s transform;">
                <span style="font-size:1.1rem;">←</span> ${label}
            </a>
        </div>`;

    document.body.insertAdjacentHTML('afterbegin', navHTML);
};

window.changePage = (id, el) => {
    if (id === 'library' && !auth.currentUser) {
        UIService.showNotification("Please sign in to access Library", "info");
        document.getElementById('auth-overlay').style.display = 'flex';
        return;
    }
    UIService.changePage(id, el);
    if (id === 'library') window.loadUserLibrary();
};

const patchGlobalLinks = () => {
    const domain = "https://promptvaultusa.shop";
    const legalLinks = document.querySelectorAll('a[href*="trust-center.html"]');
    legalLinks.forEach(link => {
        const currentHref = link.getAttribute('href');
        if (currentHref.includes('#privacy')) link.href = `${domain}/trust-center.html#privacy`;
        else if (currentHref.includes('#terms')) link.href = `${domain}/trust-center.html#terms`;
        else if (currentHref.includes('#refunds')) link.href = `${domain}/trust-center.html#refunds`;
        else link.href = `${domain}/trust-center.html`;
    });
};

// --- 2. Secure User Provisioning ---
let isProvisioning = false;
async function ensureUserProfile(user) {
    if (isProvisioning) return;
    isProvisioning = true;
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                joinedDate: new Date().toISOString(),
                purchasedPrompts: [] 
            });
            UIService.showNotification("Vault Profile Created!", "success");
        }
    } catch (e) { console.error("Provisioning Error:", e); } finally { isProvisioning = false; }
}

// --- 3. Unified State Observer ---
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-pill');
    const kitBtn = document.getElementById('claim-kit-btn');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        await ensureUserProfile(user); 
        if (loginBtn) {
            loginBtn.innerText = "Logout";
            loginBtn.onclick = () => signOut(auth);
        }
        if (kitBtn) {
            kitBtn.innerText = "Access My Library";
            kitBtn.style.background = "var(--accent)";
            kitBtn.onclick = () => window.changePage('library');
        }
        if (authOverlay) authOverlay.style.display = 'none';
        
        if (window.location.pathname.includes('success.html')) {
            const txID = new URLSearchParams(window.location.search).get('tx');
            if (txID) FulfillmentService.verifyAndDeliver(txID);
        }
    } else {
        if (loginBtn) loginBtn.innerText = "Sign In";
        if (kitBtn) kitBtn.innerText = "Unlock The Vault";
        const grid = document.getElementById('user-library-grid');
        if (grid) grid.innerHTML = ''; 
        UIService.refreshCartUI(); 
    }
});

// --- 4. Library Logic ---
window.loadUserLibrary = async () => {
    const user = auth.currentUser;
    const grid = document.getElementById('user-library-grid');
    if (!grid || !user) return;
    const freeAssets = [
        { productName: "✉️ Welcome Letter & Hub Guide", driveLink: "https://drive.google.com/file/d/1_iV_c3L32pn9Njksp35IMt7gi7L0ikYG/view?usp=drivesdk", type: "Permanent" },
        { productName: "🎁 2026 AI Starter Kit", driveLink: "https://drive.google.com/file/d/1Hk5zxOZJbiHdxSZYKZOFlHQ5JzreCwgs/view?usp=drivesdk", type: "Permanent" }
    ];
    try {
        grid.innerHTML = '<div class="loader">Accessing Vault...</div>';
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const purchased = userDocSnap.exists() ? (userDocSnap.data().purchasedPrompts || []) : [];
        const allPrompts = [...freeAssets, ...purchased];
        grid.innerHTML = allPrompts.map(item => `
            <div class="library-card">
                <div><h4>${item.productName}</h4><small>${item.type || 'Purchased Access'}</small></div>
                <a href="${item.driveLink}" target="_blank" class="btn-main">Open Access</a>
            </div>`).join('');
    } catch (e) { grid.innerHTML = '<p style="color:red;">Error loading library.</p>'; }
};

// --- 5. Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    patchGlobalLinks();
    injectDynamicNavigation(); // <--- DYNAMIC BUTTON INJECTION
    
    const urlParams = new URLSearchParams(window.location.search);
    const actions = {
        'library': () => window.changePage('library'),
        'browse': () => window.changePage('browse'),
        'checkout': () => window.openCheckout()
    };
    const trigger = urlParams.get('page') || urlParams.get('action');
    if (actions[trigger]) actions[trigger]();
});
