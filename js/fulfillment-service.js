/**
 * PROJECT MEMORY: Fulfillment Service
 * Responsibility: Verifying PayPal transactions and unlocking Library assets.
 * REUSES: auth, db from firebase-config.js
 */

import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const FulfillmentService = {
    /**
     * The "Master Unlock" function.
     * @param {string} txID - The transaction ID passed back from PayPal.
     */
    verifyAndDeliver: async (txID) => {
        if (!txID) throw new Error("No transaction ID provided.");

        // 1. Wait for Auth to initialize (Safety Check)
        const user = auth.currentUser;
        if (!user) throw new Error("User session not found. Please log in.");

        // 2. Fetch the pending order from the 'orders' collection
        const orderRef = doc(db, "orders", txID);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            throw new Error("Order record not found.");
        }

        const orderData = orderSnap.data();

        // 3. Security: Ensure the order belongs to the logged-in user
        if (orderData.uid !== user.uid) {
            throw new Error("Security Violation: User mismatch.");
        }

        // 4. Check if already completed (Prevents double-claiming on refresh)
        if (orderData.status === 'completed') {
            return { status: 'already_done', items: orderData.items };
        }

        // 5. Success! Unlock the items in the User's Profile
        const userRef = doc(db, "users", user.uid);
        
        // Map products to the format the Library expects
        const newAssets = orderData.items.map(item => ({
            productName: item.name,
            driveLink: item.driveLink || "https://promptvaultusa.shop/help", // Fallback
            timestamp: Date.now()
        }));

        // Update the User document and the Order document simultaneously
        await updateDoc(userRef, {
            purchasedPrompts: arrayUnion(...newAssets)
        });

        await updateDoc(orderRef, {
            status: 'completed',
            deliveredAt: new Date().toISOString()
        });

        return { status: 'success', items: newAssets };
    }
};
