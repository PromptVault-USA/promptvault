/**
 * PROJECT MEMORY: Security & Transaction Service (v2.5)
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
        // 1. Hard Auth Check
        const user = auth.currentUser;
        if (!user) {
            throw new Error("🔒 Security Alert: You must be signed in to complete a purchase.");
        }

        const txID = SecurityService.generateTxID();
        const total = items.reduce((sum, i) => sum + i.price, 0);

        // 2. Data Normalization (Prevents 'undefined' breaking Firestore)
        const orderData = {
            uid: user.uid,
            userEmail: user.email,
            items: items.map(i => ({
                name: i.name || "Unknown Product",
                price: i.price || 0,
                driveLink: i.driveLink || i.download || "https://promptvaultusa.shop/support"
            })),
            status: 'pending',
            amount: Number(total.toFixed(2)),
            currency: 'USD',
            createdAt: new Date().toISOString()
        };

        try {
            // 3. EXECUTION LOCK: We await the save specifically to 'orders' collection
            // This is the most important step for the checkout to actually work.
            const orderRef = doc(db, "orders", txID);
            await setDoc(orderRef, orderData);
            
            console.log("✅ Order Locked:", txID);
            return { txID, total };
        } catch (error) {
            console.error("❌ Security Service Error:", error);
            throw new Error("Database connection failed. Please check your internet.");
        }
    },

    /**
     * Reusable PayPal Redirect Logic
     */
    initiatePayPal: (txID, total, itemNames) => {
        const PAYPAL_EMAIL = "emilyperong23@gmail.com";
        
        // Success URL includes the Transaction ID for fulfillment-service.js to pick up
        const returnURL = `${window.location.origin}/success.html?tx=${txID}`;
        
        const params = new URLSearchParams({
            cmd: "_xclick",
            business: PAYPAL_EMAIL,
            currency_code: "USD",
            amount: total.toFixed(2),
            item_name: itemNames.substring(0, 120), // PayPal limit is 127 chars
            custom: txID, 
            no_shipping: "1",
            return: returnURL,
            cancel_return: `${window.location.origin}/index.html?action=browse`,
            rm: "2" // Directs PayPal to use a POST redirect back to your site
        });

        // 4. FINAL HANDOFF
        window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
    }
};
