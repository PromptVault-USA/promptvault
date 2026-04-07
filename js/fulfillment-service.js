/**
 * PROJECT MEMORY: Fulfillment Service (v2.9 - Hardened)
 * Status: Production-Ready / AdSense Compliant
 * Responsibility: Secure PayPal Verification & Library Unlocking
 * UPGRADE: Unified CDN Imports to prevent "Multiple App Instance" crashes.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// RE-DECLARE CONFIG: Ensures this module has its own clean handshake with Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDGB5seZrnWVXv--Yr_z1lPOOk1kO5CLFU",
    authDomain: "promptvaultusa.firebaseapp.com",
    projectId: "promptvaultusa",
    storageBucket: "promptvaultusa.firebasestorage.app",
    messagingSenderId: "960105895017",
    appId: "1:960105895017:web:1aa79742d36960d2bfbef8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Race-Condition Guard: Waits for Firebase Auth to determine user status
 * before the script proceeds with the transaction check.
 */
const getCurrentUser = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
};

export const FulfillmentService = {
    /**
     * verifyAndDeliver: The Bridge between PayPal and the User's Vault.
     * @param {string} txID - The transaction ID from the URL (?tx=...)
     */
    verifyAndDeliver: async (txID) => {
        if (!txID) throw new Error("Transaction ID is missing from the request.");

        // 1. Resolve the User (Auth Handshake)
        const user = await getCurrentUser();
        if (!user) throw new Error("🔒 Please sign in to verify and unlock your assets.");

        // 2. Fetch Order from 'orders' collection
        const orderRef = doc(db, "orders", txID);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            // Friendly message in case PayPal Webhook is slightly delayed
            throw new Error("Vault sync in progress... Please refresh in 30 seconds.");
        }

        const orderData = orderSnap.data();

        // 3. Security: Prevent unauthorized cross-account claiming
        if (orderData.uid !== user.uid) {
            throw new Error("Security Violation: Order UID does not match current user.");
        }

        // 4. Data Normalization: Prep for the Library UI
        const normalizedItems = orderData.items.map(item => ({
            productName: item.name || item.productName || "AI Prompt Asset",
            driveLink: item.driveLink || "https://promptvaultusa.shop/support",
            timestamp: Date.now() // Fresh timestamp for sorting
        }));

        // 5. Check Status (Avoid redundant writes)
        if (orderData.status === 'completed') {
            return { status: 'already_delivered', items: normalizedItems };
        }

        // 6. Final Fulfillment
        const userRef = doc(db, "users", user.uid);
        
        try {
            // Atomic update: Adds items to array without overwriting existing ones
            await updateDoc(userRef, {
                purchasedPrompts: arrayUnion(...normalizedItems)
            });

            // Close the loop: Mark order as completed
            await updateDoc(orderRef, {
                status: 'completed',
                deliveredAt: new Date().toISOString()
            });

            return { status: 'success', items: normalizedItems };
        } catch (dbError) {
            console.error("Fulfillment Write Error:", dbError);
            throw new Error("Could not write to your Vault. Please check your connection.");
        }
    }
};
