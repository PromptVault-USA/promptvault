/**
 * PROJECT MEMORY: Main Entry Point (v2.4)
 * Responsibility: Coordinating all services and attaching them to the HTML.
 * REUSES: UIService, SecurityService, and Firebase Auth
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

// --- 2. User Provisioning (The "Welcome" Logic) ---
async function ensureUserProfile(user) {
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
        UIService.showNotification("Vault Profile Created! Check your Library.", "success");
    }
}

// --- 3. Enhanced Authentication Logic ---
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-pill');
    const kitBtn = document.getElementById('claim-kit-btn');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        await ensureUserProfile(user); // Ensure they have a profile on every login
        if (loginBtn) {
            loginBtn.innerText = "Logout";
            loginBtn.onclick = () => signOut(auth);
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
            loginBtn.onclick = () => authOverlay.style.display = 'flex';
        }
        if (kitBtn) {
            kitBtn.innerText = "Get Instant Access Now";
            kitBtn.onclick = () => authOverlay.style.display = 'flex';
        }
    }
});

// Auth Handlers attached to window for HTML access
window.handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } 
    catch(e) { UIService.showNotification(e.message, 'error'); }
};

window.handleEmailAuth = async (mode) => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    if(!email || !pass) return UIService.showNotification("Fill all fields.", 'info');
    try {
        if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) { UIService.showNotification(e.message, 'error'); }
};

// --- 4. Secure Commerce Logic ---
window.addToCart = (productStr) => {
    if (!auth.currentUser) return UIService.showNotification("🔒 Please Sign In first.", "info");
    const product = JSON.parse(decodeURIComponent(productStr));
    let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
    if (cart.some(item => item.id === product.id)) return UIService.showNotification("Item already in cart", "info");
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    UIService.refreshCartUI();
    UIService.showNotification(`Added ${product.name} to cart!`, "success");
};

window.processPaypalCheckout = async () => {
    const cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
    if (cart.length === 0) return UIService.showNotification("Your cart is empty!", "info");
    try {
        UIService.showNotification("Securing transaction...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout(cart);
        const itemNames = cart.map(i => i.name).join(', ');
        localStorage.removeItem('pv_cart'); 
        SecurityService.initiatePayPal(txID, total, itemNames);
    } catch (e) { UIService.showNotification(e.message, "error"); }
};

window.processDirectPurchase = async (productStr) => {
    if (!auth.currentUser) return UIService.showNotification("🔒 Please Sign In first.", "info");
    const product = JSON.parse(decodeURIComponent(productStr));
    try {
        UIService.showNotification("Initializing secure link...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout([product]);
        SecurityService.initiatePayPal(txID, total, product.name);
    } catch (e) { UIService.showNotification(e.message, "error"); }
};

// --- 5. Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('page') === 'library') UIService.changePage('library');
    else if(urlParams.get('action') === 'browse') UIService.changePage('browse');
});
