/**
 * PROJECT MEMORY: Main Entry Point (v2.8)
 * Status: Production-Ready / AdSense Audited
 * Responsibility: Orchestrating Services, Secure Auth, & Commerce.
 * UPGRADES: Added explicit Library loading & Schema sync for driveLink.
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

// --- 1. Global Bridge (Mapping Services to HTML) ---
window.changePage = (id, el) => {
    UIService.changePage(id, el);
    // Explicitly trigger library load if navigating to library
    if (id === 'library') window.loadUserLibrary();
};
window.filterProducts = UIService.filterProducts;
window.updateCartCount = UIService.refreshCartUI;

window.openCheckout = () => {
    const modal = document.getElementById('checkout-overlay');
    if (modal) {
        modal.style.display = 'flex';
        UIService.refreshCartUI(); 
    }
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
                purchasedPrompts: [
                    { productName: "✉️ Welcome Letter & Hub Guide", driveLink: "https://drive.google.com/file/d/1_iV_c3L32pn9Njksp35IMt7gi7L0ikYG/view?usp=drivesdk", timestamp: Date.now() + 10 },
                    { productName: "🎁 2026 AI Starter Kit (Free)", driveLink: "https://drive.google.com/file/d/1Hk5zxOZJbiHdxSZYKZOFlHQ5JzreCwgs/view?usp=drivesdk", timestamp: Date.now() }
                ]
            });
            UIService.showNotification("Vault Profile Created!", "success");
        }
    } catch (e) {
        console.error("Provisioning Error:", e);
    } finally {
        isProvisioning = false;
    }
}

// --- 3. Enhanced Authentication Logic ---
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-pill');
    const kitBtn = document.getElementById('claim-kit-btn');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        await ensureUserProfile(user); 
        // Trigger library load immediately on login
        window.loadUserLibrary();

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
        
        // Success Page Detection
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
            kitBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        UIService.refreshCartUI(); 
    }
});

// Auth Handlers (Globalized)
window.handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } 
    catch(e) { UIService.showNotification("Login failed.", 'error'); }
};

window.handleEmailAuth = async (mode) => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return UIService.showNotification("Fill all fields.", 'info');
    try {
        if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) { UIService.showNotification("Auth Error.", 'error'); }
};

// --- 4. Secure Commerce Logic (Globalized) ---
window.addToCart = (productStr) => {
    if (!auth.currentUser) {
        const overlay = document.getElementById('auth-overlay');
        if(overlay) overlay.style.display = 'flex';
        return;
    }
    const product = JSON.parse(decodeURIComponent(productStr));
    let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
    
    if (cart.some(item => item.id === product.id)) {
        return UIService.showNotification("Already in cart", "info");
    }
    
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    UIService.refreshCartUI();
    UIService.showNotification(`Added ${product.name}!`, "success");
};

window.processPaypalCheckout = async () => {
    const cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
    if (cart.length === 0) return UIService.showNotification("Cart is empty!", "info");
    
    try {
        UIService.showNotification("Preparing Secure Checkout...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout(cart);
        SecurityService.initiatePayPal(txID, total, cart.map(i => i.name).join(', '));
    } catch (e) { UIService.showNotification("Checkout Failed.", "error"); }
};

window.processDirectPurchase = async (productStr) => {
    if (!auth.currentUser) {
        document.getElementById('auth-overlay').style.display = 'flex';
        return;
    }
    const product = JSON.parse(decodeURIComponent(productStr));
    try {
        UIService.showNotification("Connecting to PayPal...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout([product]);
        SecurityService.initiatePayPal(txID, total, product.name);
    } catch (e) { UIService.showNotification("Purchase Failed.", "error"); }
};

// --- 5. Library Logic (Unified Schema) ---
window.loadUserLibrary = async () => {
    const user = auth.currentUser;
    const grid = document.getElementById('user-library-grid');
    if (!grid || !user) return;

    try {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
            const prompts = userDocSnap.data().purchasedPrompts || [];
            prompts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            if (prompts.length === 0) {
                grid.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Your vault is empty. Start your collection in the shop!</p>`;
                return;
            }

            grid.innerHTML = prompts.map(item => `
                <div class="library-card">
                    <div>
                        <h4 style="margin:0; color:white;">${item.productName}</h4>
                        <small style="color:var(--secondary);">Permanent Access</small>
                    </div>
                    <a href="${item.driveLink}" target="_blank" class="btn-main" style="padding:10px 15px; font-size:0.75rem; background:var(--success); text-decoration:none;">Open PDF</a>
                </div>`).join('');
        }
    } catch (e) {
        console.error("Library Error:", e);
    }
};

// --- 6. Routing & SPA Consistency ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('page') === 'library') window.changePage('library');
    else if (urlParams.get('action') === 'browse') window.changePage('browse');
    else if (urlParams.get('action') === 'checkout') window.openCheckout();
});
