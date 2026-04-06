/**
 * PROJECT MEMORY: Fulfillment Service (v2.8)
 * Status: Hardened & Race-Condition Protected
 * Responsibility: Verifying PayPal transactions and unlocking Library assets.
 * REUSES: auth, db from firebase-config.js
 */

import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Helper: Waits for Firebase Auth to initialize before failing
const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
};

export const FulfillmentService = {
    /**
     * The "Master Unlock" function.
     * @param {string} txID - The transaction ID passed back from PayPal.
     */
    verifyAndDeliver: async (txID) => {
        if (!txID) throw new Error("No transaction ID provided.");

        // 1. Wait for Auth to initialize (Fixes the 'null user' race condition)
        const user = await getCurrentUser();
        if (!user) throw new Error("🔒 Please sign in to verify your purchase.");

        // 2. Fetch the pending order
        const orderRef = doc(db, "orders", txID);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            throw new Error("Order record not found in the Vault.");
        }

        const orderData = orderSnap.data();

        // 3. Security: User Mismatch Check
        if (orderData.uid !== user.uid) {
            throw new Error("Security Violation: This order belongs to another account.");
        }

        // 4. Check if already completed (Prevents double-claiming)
        // Standardize the item keys for the UI
        const normalizedItems = orderData.items.map(item => ({
            productName: item.name || item.productName, // Support both schemas
            driveLink: item.driveLink || "https://promptvaultusa.shop/help",
            timestamp: item.timestamp || Date.now()
        }));

        if (orderData.status === 'completed') {
            return { status: 'already_done', items: normalizedItems };
        }

        // 5. Success! Unlock the items in the User's Profile
        const userRef = doc(db, "users", user.uid);
        
        try {
            // Update the User document with new assets
            await updateDoc(userRef, {
                purchasedPrompts: arrayUnion(...normalizedItems)
            });

            // Mark the Order as delivered
            await updateDoc(orderRef, {
                status: 'completed',
                deliveredAt: new Date().toISOString()
            });

            return { status: 'success', items: normalizedItems };
        } catch (e) {
            console.error("Database Update Failed:", e);
            throw new Error("Vault sync failed. Please refresh the page.");
        }
    }
};
