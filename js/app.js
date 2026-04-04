import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

// Global State
let allProducts = []; // Added to keep a reference for automation
const PAYPAL_EMAIL = "emilyperong23@gmail.com";

window.UI = {
    modal: (id, state) => {
        const el = document.getElementById(id);
        if (el) el.style.display = state === 'open' ? 'flex' : 'none';
    },
    toast: (msg) => {
        const notif = document.getElementById('sales-notif');
        const text = document.getElementById('notif-text');
        if (notif && text) {
            text.innerText = msg;
            notif.style.display = 'flex';
            setTimeout(() => { notif.style.display = 'none'; }, 4000);
        }
    }
};

window.handleGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
        UI.modal('auth-overlay', 'close');
        UI.toast("Welcome to the Vault!");
    } catch (e) {
        alert("Auth Error: " + e.message);
    }
};

onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('login-pill');
    const kitBtn = document.getElementById('claim-kit-btn');
    if (user) {
        if (loginBtn) { loginBtn.innerText = "Logout"; loginBtn.onclick = () => signOut(auth); }
        if (kitBtn) kitBtn.innerText = "Download Starter Kit Now";
    } else {
        if (loginBtn) { loginBtn.innerText = "Sign In / Join"; loginBtn.onclick = () => UI.modal('auth-overlay', 'open'); }
        if (kitBtn) kitBtn.innerText = "Sign In to Claim Kit";
    }
});

window.renderProducts = async () => {
    const list = document.getElementById('product-list');
    if (!list) return;
    list.innerHTML = '<p style="color:white; text-align:center; width:100%;">Syncing 2026 Intelligence Data...</p>';
    try {
        const res = await fetch('products.json');
        allProducts = await res.json();
        
        list.innerHTML = allProducts.map(p => `
            <div class="glass-card" style="display:flex; flex-direction:column; border:1px solid var(--border); border-radius:24px; padding:20px;">
                <div style="aspect-ratio:1/1; border-radius:15px; overflow:hidden; margin-bottom:15px; border:1px solid var(--border); background:#000;">
                    <img src="${p.img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400?text=AI+Vault'">
                </div>
                <div style="font-weight:800; font-size:1.1rem; margin-bottom:5px;">${p.name}</div>
                <div style="color:var(--secondary); font-weight:800; font-size:1.4rem; margin-bottom:15px;">$${p.price.toFixed(2)}</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button onclick="window.processSinglePay('${p.id}')" class="btn-main" style="background:var(--success); color:white;">Buy Now</button>
                    <a href="product.html?id=${p.id}" class="btn-main" style="background:var(--glass); text-decoration:none; text-align:center; font-size:0.8rem; padding:10px;">Details</a>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<p style="color:red;">Failed to load vault: ${e.message}</p>`;
    }
};

// UPDATED: Automation logic to store the product before redirecting
window.processSinglePay = (productId) => {
    if (!auth.currentUser) {
        UI.modal('auth-overlay', 'open');
        return;
    }
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        // This is the magic step for automation
        localStorage.setItem('last_clicked_product', JSON.stringify(product));
        window.location.href = product.paylink;
    }
};

window.changePage = (id, el) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    if (id === 'browse') renderProducts();
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#browse') { changePage('browse'); }
    setInterval(() => {
        const cities = ["Chicago", "Cebu", "London", "Manila", "Sydney", "Dubai", "New York"];
        const city = cities[Math.floor(Math.random() * cities.length)];
        UI.toast(`Someone in ${city} just joined the Vault!`);
    }, 15000);
});
