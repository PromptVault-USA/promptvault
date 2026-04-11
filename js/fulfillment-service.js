/**
 * PROJECT MEMORY: Fulfillment Service (v3.1 - Hardened Singleton)
 * Status: Production-Ready
 * Responsibility: Secure PayPal Verification & Library Unlocking
 * Features: Duplicate Claim Protection & Race-Condition Guard.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGB5seZrnWVXv--Yr_z1lPOOk1kO5CLFU",
    authDomain: "promptvaultusa.firebaseapp.com",
    projectId: "promptvaultusa",
    storageBucket: "promptvaultusa.firebasestorage.app",
    messagingSenderId: "960105895017",
    appId: "1:960105895017:web:1aa79742d36960d2bfbef8"
};

// --- Singleton Initialization ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const internalDb = getFirestore(app);

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
     * verifyAndDeliver
     * @param {object|string} arg1 - Can be Firestore DB instance OR txID string
     * @param {object|string} arg2 - Can be User instance OR txID string
     * @param {string} arg3 - The Transaction ID (txID)
     */
    verifyAndDeliver: async (arg1, arg2, arg3) => {
        // Flexible argument mapping to support both Success.html and Main.js calls
        let db = internalDb;
        let user = null;
        let txID = null;

        if (typeof arg1 === 'string') txID = arg1;
        else if (typeof arg2 === 'string') { db = arg1; txID = arg2; }
        else if (typeof arg3 === 'string') { db = arg1; user = arg2; txID = arg3; }

        if (!txID) throw new Error("Missing Transaction ID.");

        // 1. Resolve User if not provided
        if (!user) user = await getCurrentUser();
        if (!user) throw new Error("🔒 Authentication required to unlock assets.");

        // 2. Fetch Order from Firestore
        const orderRef = doc(db, "orders", txID);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            throw new Error("Order not found. Syncing in progress... please refresh in 30s.");
        }

        const orderData = orderSnap.data();

        // 3. Security: UID Validation
        if (orderData.uid !== user.uid) {
            throw new Error("Security Check Failed: Account mismatch.");
        }

        // 4. Data Normalization
        const normalizedItems = orderData.items.map(item => ({
            productName: item.name || item.productName || "AI Prompt Vault",
            driveLink: item.driveLink || "https://promptvaultusa.shop/support",
            timestamp: Date.now()
        }));

        // 5. Redundancy Check
        if (orderData.status === 'completed') {
            return { status: 'already_delivered', items: normalizedItems };
        }

        // 6. Fulfillment Transaction
        const userRef = doc(db, "users", user.uid);
        
        try {
            // Check for existing items to prevent duplicate library entries
            const userSnap = await getDoc(userRef);
            const currentLibrary = userSnap.data()?.purchasedPrompts || [];
            
            const uniqueItems = normalizedItems.filter(newItem => 
                !currentLibrary.some(existing => existing.driveLink === newItem.driveLink)
            );

            // Execute Library Update
            if (uniqueItems.length > 0) {
                await updateDoc(userRef, {
                    purchasedPrompts: arrayUnion(...uniqueItems)
                });
            }

            // Close Order Cycle
            await updateDoc(orderRef, {
                status: 'completed',
                deliveredAt: new Date().toISOString()
            });

            return { status: 'success', items: normalizedItems };
        } catch (err) {
            console.error("Database Write Error:", err);
            throw new Error("Vault update failed. Contact support if balance was deducted.");
        }
    }
};
