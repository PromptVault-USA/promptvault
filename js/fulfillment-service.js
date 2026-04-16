/**
 * PROJECT MEMORY: Fulfillment Service (v3.2 - Atomic Transaction)
 * Status: Bank-Grade Hardened
 * Responsibility: Atomic Verification & Asset Delivery
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
            // ATOMIC TRANSACTION START
            const result = await runTransaction(db, async (transaction) => {
                // 1. READ PHASE
                const orderSnap = await transaction.get(orderRef);
                const userSnap = await transaction.get(userRef);

                if (!orderSnap.exists()) {
                    throw "Order not found. Please wait 30s and refresh.";
                }

                const orderData = orderSnap.data();

                // 2. SECURITY & STATE CHECKS
                if (orderData.uid !== user.uid) throw "Security Check Failed.";
                if (orderData.status === 'completed') {
                    return { status: 'already_delivered' };
                }

                // 3. LOGIC PHASE (Normalization & Duplicate Filtering)
                const normalizedItems = orderData.items.map(item => ({
                    productName: item.name || item.productName || "AI Prompt Vault",
                    driveLink: item.driveLink || "https://promptvaultusa.shop/support",
                    timestamp: Date.now()
                }));

                const currentLibrary = userSnap.data()?.purchasedPrompts || [];
                const uniqueItems = normalizedItems.filter(newItem => 
                    !currentLibrary.some(existing => existing.driveLink === newItem.driveLink)
                );

                // 4. WRITE PHASE
                if (uniqueItems.length > 0) {
                    transaction.update(userRef, {
                        purchasedPrompts: arrayUnion(...uniqueItems)
                    });
                }

                transaction.update(orderRef, {
                    status: 'completed',
                    deliveredAt: new Date().toISOString(),
                    verifiedBy: 'AtomicTransaction_v3.2'
                });

                return { status: 'success', items: normalizedItems };
            });

            return result;

        } catch (err) {
            console.error("Fulfillment Transaction Failed:", err);
            throw new Error(typeof err === 'string' ? err : "Vault update failed.");
        }
    }
};
