/**
 * PROJECT MEMORY: Main Entry Point (v2.6)
 * Status: Blog Optimized & Audited
 * Responsibility: Orchestrating Services & Secure Auth-UI Bridging.
 */

import { auth, db } from './firebase-config.js';
import { UIService } from './ui-service.js';
import { SecurityService } from './security-service.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. Global Bridge (Mapping Services to HTML) ---
window.changePage = UIService.changePage;
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
        if (loginBtn) {
            loginBtn.innerText = "Logout";
            loginBtn.onclick = () => {
                localStorage.removeItem('pv_cart'); 
                signOut(auth);
            };
        }
        if (kitBtn) {
            kitBtn.innerText = "Access My Library";
            kitBtn.style.background = "var(--accent)";
            kitBtn.onclick = () => UIService.changePage('library');
        }
        if (authOverlay) authOverlay.style.display = 'none';
    } else {
        if (loginBtn) {
            loginBtn.innerText = "Sign In";
            loginBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        if (kitBtn) {
            kitBtn.innerText = "Get Instant Access Now";
            kitBtn.onclick = () => { if(authOverlay) authOverlay.style.display = 'flex'; };
        }
        UIService.refreshCartUI(); 
    }
});

// Auth Handlers
window.handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try { 
        await signInWithPopup(auth, provider); 
    } catch(e) { 
        UIService.showNotification("Login failed. Try again.", 'error'); 
    }
};

window.handleEmailAuth = async (mode) => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return UIService.showNotification("Fill all fields.", 'info');
    try {
        if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) { 
        UIService.showNotification("Auth Error: Check credentials.", 'error'); 
    }
};

// --- 4. Secure Commerce Logic ---
window.addToCart = (productStr) => {
    if (!auth.currentUser) {
        const overlay = document.getElementById('auth-overlay');
        if(overlay) overlay.style.display = 'flex';
        return UIService.showNotification("Please Sign In to shop.", "info");
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
        UIService.showNotification("Securing transaction...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout(cart);
        const itemNames = cart.map(i => i.name).join(', ');
        SecurityService.initiatePayPal(txID, total, itemNames);
    } catch (e) { 
        UIService.showNotification("Checkout Failed.", "error"); 
    }
};

window.processDirectPurchase = async (productStr) => {
    if (!auth.currentUser) {
        const overlay = document.getElementById('auth-overlay');
        if(overlay) overlay.style.display = 'flex';
        return;
    }
    const product = JSON.parse(decodeURIComponent(productStr));
    try {
        UIService.showNotification("Connecting to PayPal...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout([product]);
        SecurityService.initiatePayPal(txID, total, product.name);
    } catch (e) { 
        UIService.showNotification("Purchase Failed.", "error"); 
    }
};

// --- 5. Initialize & Routing ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    const urlParams = new URLSearchParams(window.location.search);
    
    // NEW: Logic for "Back to Stories" and SPA consistency
    if (urlParams.get('page') === 'library') UIService.changePage('library');
    else if (urlParams.get('action') === 'browse') UIService.changePage('browse');
    else if (urlParams.get('action') === 'checkout') window.openCheckout();
    else if (urlParams.get('action') === 'blog') {
        // If blog is a section in index.html, trigger it here:
        // UIService.changePage('blog-section-id'); 
    }
});
