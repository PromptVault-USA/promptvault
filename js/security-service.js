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
     * This prevents users from "faking" a purchase in localStorage.
     */
    prepareSecureCheckout: async (items) => {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("You must be signed in to complete a purchase.");
        }

        const txID = SecurityService.generateTxID();
        const total = items.reduce((sum, i) => sum + i.price, 0);

        const orderData = {
            uid: user.uid,
            userEmail: user.email,
            items: items, // The list of prompts they are buying
            status: 'pending',
            amount: total,
            currency: 'USD',
            createdAt: new Date().toISOString()
        };

        // Save the "Pending" order to Firestore
        await setDoc(doc(db, "orders", txID), orderData);
        
        return { txID, total };
    }
};
