/**
 * PROJECT MEMORY: Main Entry Point
 * Responsibility: Coordinating all services and attaching them to the HTML.
 * REUSES: UIService, SecurityService, and Firebase Auth
 */

import { auth, db } from './firebase-config.js';
import { UIService } from './ui-service.js';
import { SecurityService } from './security-service.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. Global Setup ---
const PAYPAL_EMAIL = "emilyperong23@gmail.com";

// --- 2. Authentication Observer ---
onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('login-pill');
    if (user) {
        loginBtn.innerText = "Logout";
        loginBtn.onclick = () => signOut(auth);
        UIService.showNotification(`Welcome back, ${user.email.split('@')[0]}!`, 'success');
    } else {
        loginBtn.innerText = "Sign In";
        loginBtn.onclick = () => document.getElementById('auth-overlay').style.display = 'flex';
    }
});

// --- 3. Secure Checkout Logic (The New Way) ---
window.processPaypalCheckout = async () => {
    const cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
    if (cart.length === 0) return UIService.showNotification("Your cart is empty!", "info");

    try {
        UIService.showNotification("Securing transaction...", "info");
        
        // Use the Security Service to lock the order
        const { txID, total } = await SecurityService.prepareSecureCheckout(cart);

        // Clear local storage - we now rely on the database 'txID'
        localStorage.removeItem('pv_cart');
        
        const itemNames = cart.map(i => i.name).join(', ');
        const returnURL = `${window.location.origin}/success.html?tx=${txID}`;

        // Redirect to PayPal
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${PAYPAL_EMAIL}&amount=${total.toFixed(2)}&currency_code=USD&item_name=${encodeURIComponent(itemNames)}&custom=${txID}&no_shipping=1&return=${returnURL}`;
        
    } catch (e) {
        UIService.showNotification(e.message, "error");
    }
};

// --- 4. Initialize UI on Load ---
document.addEventListener('DOMContentLoaded', () => {
    UIService.refreshCartUI();
});
