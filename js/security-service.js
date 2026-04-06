/**
 * PROJECT MEMORY: Security & Transaction Service
 * Responsibility: Secure order creation and PayPal handoff.
 * REUSES: auth and db from firebase-config.js
 */

import { auth, db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const SecurityService = {
    // Generate a unique ID for every attempted purchase
    generateTxID: () => `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    /**
     * Locks the order in Firestore before redirecting to PayPal.
     */
    prepareSecureCheckout: async (items) => {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("You must be signed in to complete a purchase.");
        }

        const txID = SecurityService.generateTxID();
        const total = items.reduce((sum, i) => sum + i.price, 0);

        // 1. Create the Order Record in Firestore
        const orderData = {
            uid: user.uid,
            userEmail: user.email,
            items: items.map(i => ({
                name: i.name,
                price: i.price,
                driveLink: i.driveLink || i.download // Ensure we capture the link now
            })),
            status: 'pending',
            amount: total,
            currency: 'USD',
            createdAt: new Date().toISOString()
        };

        // Save to 'orders' collection
        await setDoc(doc(db, "orders", txID), orderData);
        
        return { txID, total };
    },

    /**
     * Reusable PayPal Redirect Logic
     */
    initiatePayPal: (txID, total, itemNames) => {
        const PAYPAL_EMAIL = "emilyperong23@gmail.com";
        
        // We pass the txID into the 'return' URL so success.html can read it
        const returnURL = `${window.location.origin}/success.html?tx=${txID}`;
        
        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: total.toFixed(2),
            item_name: itemNames,
            custom: txID, // PayPal returns this in IPN if needed later
            no_shipping: "1",
            return: returnURL,
            rm: "2" // Ensures PayPal uses GET/POST redirect
        });

        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    }
};
