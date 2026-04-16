/**
 * PROJECT MEMORY: Main Entry Point (v3.0 - Post-Audit)
 * Status: Hardened & Optimized
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

// --- 1. Global Navigation Bridge ---
window.changePage = (id, el) => {
    // Prevent navigating to library if logged out
    if (id === 'library' && !auth.currentUser) {
        UIService.showNotification("Please sign in to access Library", "info");
        document.getElementById('auth-overlay').style.display = 'flex';
        return;
    }
    UIService.changePage(id, el);
    if (id === 'library') window.loadUserLibrary();
};

// --- 2. Secure User Provisioning (The "Gatekeeper") ---
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
        // Logged In State
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
        
        // Handle post-payment verification
        if (window.location.pathname.includes('success.html')) {
            const txID = new URLSearchParams(window.location.search).get('tx');
            if (txID) FulfillmentService.verifyAndDeliver(txID);
        }
    } else {
        // Logged Out State (Cleanup)
        if (loginBtn) {
            loginBtn.innerText = "Sign In";
            loginBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        if (kitBtn) {
            kitBtn.innerText = "Unlock The Vault";
            kitBtn.style.background = "var(--success)"; // Reset color
            kitBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        
        // CLEAR LIBRARY UI (Security Step)
        const grid = document.getElementById('user-library-grid');
        if (grid) grid.innerHTML = ''; 
        
        UIService.refreshCartUI(); 
    }
});

// --- 4. Library Logic (Merged Free Assets) ---
window.loadUserLibrary = async () => {
    const user = auth.currentUser;
    const grid = document.getElementById('user-library-grid');
    if (!grid) return;
    
    if (!user) {
        grid.innerHTML = '<p style="color:var(--text-gray); text-align:center;">Please sign in to view your assets.</p>';
        return;
    }

    // "Virtual Assets" - No DB read required
    const freeAssets = [
        { 
            productName: "✉️ Welcome Letter & Hub Guide", 
            driveLink: "https://drive.google.com/file/d/1_iV_c3L32pn9Njksp35IMt7gi7L0ikYG/view?usp=drivesdk",
            type: "Permanent"
        },
        { 
            productName: "🎁 2026 AI Starter Kit", 
            driveLink: "https://drive.google.com/file/d/1Hk5zxOZJbiHdxSZYKZOFlHQ5JzreCwgs/view?usp=drivesdk",
            type: "Permanent"
        }
    ];

    try {
        grid.innerHTML = '<div class="loader">Accessing Vault...</div>'; // UX Improvement
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const purchased = userDocSnap.exists() ? (userDocSnap.data().purchasedPrompts || []) : [];
        const allPrompts = [...freeAssets, ...purchased];
        
        grid.innerHTML = allPrompts.map(item => `
            <div class="library-card">
                <div>
                    <h4>${item.productName}</h4>
                    <small>${item.type || 'Purchased Access'}</small>
                </div>
                <a href="${item.driveLink}" target="_blank" class="btn-main">Open Access</a>
            </div>`).join('');
            
    } catch (e) {
        grid.innerHTML = '<p style="color:red;">Error loading library. Check connection.</p>';
    }
};

// --- 5. Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    
    // Smooth SPA Routing from URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const actions = {
        'library': () => window.changePage('library'),
        'browse': () => window.changePage('browse'),
        'checkout': () => window.openCheckout()
    };
    
    const trigger = urlParams.get('page') || urlParams.get('action');
    if (actions[trigger]) actions[trigger]();
});
