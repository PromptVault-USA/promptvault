/**
 * PROJECT MEMORY: Fulfillment Service (v4.0 - Admin-Verified Gate)
 * Status: Hardened for Free-Tier Security
 * Responsibility: Manual-to-Auto Asset Delivery
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, arrayUnion, runTransaction 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGB5seZrnWVXv--Yr_z1lPOOk1kO5CLFU",
    authDomain: "promptvaultusa.firebaseapp.com",
    projectId: "promptvaultusa",
    storageBucket: "promptvaultusa.firebasestorage.app",
    messagingSenderId: "960105895017",
    appId: "1:960105895017:web:1aa79742d36960d2bfbef8"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const internalDb = getFirestore(app);

// --- SECURE ASSET REGISTRY ---
// Links are stored here, NOT in the 'orders' document, to prevent manipulation.
const ASSET_REGISTRY = {
    "welcome_letter": "https://drive.google.com/file/d/1_iV_c3L32pn9Njksp35IMt7gi7L0ikYG/view",
    "starter_kit": "https://drive.google.com/file/d/1MBGb8x24PmqMH5CUlkxJ5ckY7cDcVf4u/view",
    "niche_001": "https://drive.google.com/file/d/1LIoHBGQdbNB6bUhp1nofXFEfsoAdYvFQ/view",
    // ... add your other niche_xxx IDs here
};

const getCurrentUser = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
};

export const FulfillmentService = {
    verifyAndDeliver: async (arg1, arg2, arg3) => {
        let db = internalDb;
        let user = null;
        let txID = null;

        if (typeof arg1 === 'string') txID = arg1;
        else if (typeof arg2 === 'string') { db = arg1; txID = arg2; }
        else if (typeof arg3 === 'string') { db = arg1; user = arg2; txID = arg3; }

        if (!txID) throw new Error("Missing Transaction ID.");
        if (!user) user = await getCurrentUser();
        if (!user) throw new Error("🔒 Authentication required.");

        const orderRef = doc(db, "orders", txID);
        const userRef = doc(db, "users", user.uid);

        try {
            const result = await runTransaction(db, async (transaction) => {
                const orderSnap = await transaction.get(orderRef);
                const userSnap = await transaction.get(userRef);

                if (!orderSnap.exists()) {
                    throw "Order not found. Please refresh.";
                }

                const orderData = orderSnap.data();

                // --- 🔥 THE SECURITY GATE ---
                // Even if the document exists, we REFUSE to deliver unless 
                // the status is 'paid_verified' (set manually by you).
                if (orderData.status !== 'paid_verified') {
                    throw "PENDING: We are verifying your PayPal transaction. Please wait 1-2 minutes.";
                }

                if (orderData.uid !== user.uid) throw "Security Check Failed.";
                
                // --- LOGIC PHASE ---
                // We map items using our internal ASSET_REGISTRY for safety
                const normalizedItems = orderData.items.map(item => ({
                    productName: item.name || "AI Prompt Vault",
                    driveLink: ASSET_REGISTRY[item.id] || "https://promptvaultusa.shop/support",
                    timestamp: Date.now()
                }));

                const currentLibrary = userSnap.data()?.purchasedPrompts || [];
                const uniqueItems = normalizedItems.filter(newItem => 
                    !currentLibrary.some(existing => existing.driveLink === newItem.driveLink)
                );

                // --- WRITE PHASE ---
                if (uniqueItems.length > 0) {
                    transaction.update(userRef, {
                        purchasedPrompts: arrayUnion(...uniqueItems)
                    });
                }

                // Close the order so it can't be reused
                transaction.update(orderRef, {
                    status: 'completed',
                    deliveredAt: new Date().toISOString()
                });

                return { status: 'success', items: normalizedItems };
            });

            return result;

        } catch (err) {
            console.error("Fulfillment Transaction Failed:", err);
            throw new Error(err);
        }
    }
};
