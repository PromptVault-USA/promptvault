/**
 * PROJECT MEMORY: Security & Transaction Service (v3.0 - Hardened)
 * Responsibility: Secure order creation without data leaks.
 * REUSES: auth and db from firebase-config.js
 */

import { auth, db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const SecurityService = {
    // Generate a unique ID for every attempted purchase
    generateTxID: () => `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    /**
     * Locks the order in Firestore before redirecting to PayPal.
     * REMOVED: driveLink from pre-payment order storage.
     */
    prepareSecureCheckout: async (items) => {
        // 1. Hard Auth Check
        const user = auth.currentUser;
        if (!user) {
            throw new Error("🔒 Security Alert: You must be signed in to complete a purchase.");
        }

        const txID = SecurityService.generateTxID();
        const total = items.reduce((sum, i) => sum + i.price, 0);

        // 2. Data Normalization (HARDENED)
        // We only store the ID and Metadata. Links are injected LATER by the FulfillmentService.
        const orderData = {
            uid: user.uid,
            userEmail: user.email,
            items: items.map(i => ({
                id: i.id, // CRITICAL: Only store the ID here
                name: i.name || "Unknown Product",
                price: i.price || 0
            })),
            status: 'pending', // Starts as pending
            amount: Number(total.toFixed(2)),
            currency: 'USD',
            createdAt: serverTimestamp() // Uses server time for security
        };

        try {
            // 3. EXECUTION LOCK
            const orderRef = doc(db, "orders", txID);
            await setDoc(orderRef, orderData);
            
            console.log("✅ Secure Order Locked:", txID);
            return { txID, total };
        } catch (error) {
            console.error("❌ Security Service Error:", error);
            throw new Error("Database connection failed. Please check your connection.");
        }
    },

    /**
     * Reusable PayPal Redirect Logic
     */
    initiatePayPal: (txID, total, itemNames) => {
        const PAYPAL_EMAIL = "emilyperong23@gmail.com";
        
        // Canonical domain for absolute URLs (Merchant Center Preference)
        const domain = "https://promptvaultusa.shop";
        
        // We use the txID as the reference so you can find it in Firebase later
        const returnURL = `${domain}/success.html?tx=${txID}`;
        
        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: total.toFixed(2),
            item_name: itemNames.substring(0, 120),
            custom: txID, // Matches the Firestore Doc ID
            no_shipping: "1",
            return: returnURL,
            cancel_return: `${domain}/vault.html`,
            rm: "2" 
        });

        // 4. FINAL HANDOFF
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    }
};
