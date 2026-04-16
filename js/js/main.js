/**
 * PROJECT MEMORY: Main Entry Point (v3.5 - Global Patching)
 * Status: Production-Ready / Subfolder-Hardened
 * Responsibility: Orchestrating Services, Secure Auth, & Global Link Integrity.
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

// --- 1. Global Navigation & Link Integrity ---
window.changePage = (id, el) => {
    if (id === 'library' && !auth.currentUser) {
        UIService.showNotification("Please sign in to access Library", "info");
        document.getElementById('auth-overlay').style.display = 'flex';
        return;
    }
    UIService.changePage(id, el);
    if (id === 'library') window.loadUserLibrary();
};

/**
 * patchGlobalLinks
 * Automatically updates relative links in subfolders (vault/blog) 
 * to point to the new absolute Trust Center URLs.
 */
const patchGlobalLinks = () => {
    const domain = "https://promptvaultusa.shop";
    
    // 1. Patch Trust Center Anchor Links
    const legalLinks = document.querySelectorAll('a[href*="trust-center.html"]');
    legalLinks.forEach(link => {
        const currentHref = link.getAttribute('href');
        if (currentHref.includes('#privacy')) link.href = `${domain}/trust-center.html#privacy`;
        else if (currentHref.includes('#terms')) link.href = `${domain}/trust-center.html#terms`;
        else if (currentHref.includes('#refunds')) link.href = `${domain}/trust-center.html#refunds`;
        else link.href = `${domain}/trust-center.html`;
    });

    // 2. Patch Home/Vault Navigation
    const homeLinks = document.querySelectorAll('a[href*="index.html"]');
    homeLinks.forEach(link => {
        if (link.getAttribute('href').includes('action=browse')) {
            link.href = `${domain}/index.html?action=browse#browse`;
        } else {
            link.href = `${domain}/index.html`;
        }
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
    } catch (e) {
        console.error("Provisioning Error:", e);
    } finally {
        isProvisioning = false;
    }
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
        if (loginBtn) {
            loginBtn.innerText = "Sign In";
            loginBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        if (kitBtn) {
            kitBtn.innerText = "Unlock The Vault";
            kitBtn.style.background = "var(--success)";
            kitBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
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
    } catch (e) {
        grid.innerHTML = '<p style="color:red;">Error loading library.</p>';
    }
};

// --- 5. Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    patchGlobalLinks(); // <--- PATCH APPLIED HERE
    
    const urlParams = new URLSearchParams(window.location.search);
    const actions = {
        'library': () => window.changePage('library'),
        'browse': () => window.changePage('browse'),
        'checkout': () => window.openCheckout()
    };
    
    const trigger = urlParams.get('page') || urlParams.get('action');
    if (actions[trigger]) actions[trigger]();
});
