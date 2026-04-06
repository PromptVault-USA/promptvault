/**
 * PROJECT MEMORY: Main Entry Point
 * Responsibility: Coordinating all services and attaching them to the HTML.
 * REUSES: UIService, SecurityService, and Firebase Auth
 */

import { auth } from './firebase-config.js';
import { UIService } from './ui-service.js';
import { SecurityService } from './security-service.js';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. Global Bridge (Mapping Services to HTML) ---
window.changePage = UIService.changePage;
window.filterProducts = UIService.filterProducts;
window.updateCartCount = UIService.refreshCartUI;

// --- 2. Enhanced Authentication Logic ---
onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('login-pill');
    const kitBtn = document.getElementById('claim-kit-btn');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
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
        UIService.showNotification(`Active Session: ${user.email}`, 'success');
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

// Auth Handlers (Reused from legacy logic but modernized)
window.handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch(e) { UIService.showNotification(e.message, 'error'); }
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

// --- 3. Secure Commerce Logic ---

window.addToCart = (productStr) => {
    if (!auth.currentUser) return UIService.showNotification("🔒 Please Sign In first.", "info");
    
    const product = JSON.parse(decodeURIComponent(productStr));
    let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
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
        
        // REUSE: Use SecurityService to handle the redirect
        const itemNames = cart.map(i => i.name).join(', ');
        localStorage.removeItem('pv_cart'); // Clear local cart after locking DB
        SecurityService.initiatePayPal(txID, total, itemNames);
        
    } catch (e) {
        UIService.showNotification(e.message, "error");
    }
};

window.processDirectPurchase = async (productStr) => {
    if (!auth.currentUser) return UIService.showNotification("🔒 Please Sign In first.", "info");
    const product = JSON.parse(decodeURIComponent(productStr));

    try {
        UIService.showNotification("Initializing secure link...", "info");
        const { txID, total } = await SecurityService.prepareSecureCheckout([product]);
        SecurityService.initiatePayPal(txID, total, product.name);
    } catch (e) {
        UIService.showNotification(e.message, "error");
    }
};

// --- 4. Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
    
    // Handle URL parameters for navigation
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('page') === 'library') UIService.changePage('library');
    if(urlParams.get('action') === 'browse') UIService.changePage('browse');

    // Load initial products if on browse page
    if (document.getElementById('browse').classList.contains('active')) {
        fetch('products.json').then(res => res.json()).then(data => UIService.renderProducts(data));
    }
});
