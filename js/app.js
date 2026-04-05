// --- PRODUCT DATA ---
const products = [
    { id: 1, name: "2026 AI Starter Kit", price: 0, category: "Free", image: "kit.jpg" },
    { id: 2, name: "Hyper-Real Real Estate Pack", price: 49, category: "Business", image: "re.jpg" },
    { id: 3, name: "E-commerce Model Vault", price: 39, category: "Marketing", image: "model.jpg" }
];

let cart = JSON.parse(localStorage.getItem('pv_cart')) || [];

// --- CORE FUNCTIONS ---

// Step 6: Search & Filter Logic
export const renderProducts = (filterText = "") => {
    const container = document.getElementById('product-list');
    if (!container) return;

    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(filterText.toLowerCase())
    );

    container.innerHTML = filtered.map(product => `
        <div class="product-card" style="background:var(--glass); padding:20px; border-radius:20px; border:1px solid var(--border);">
            <img src="${product.image}" onerror="this.src='https://via.placeholder.com/150'" style="width:100%; border-radius:10px; margin-bottom:15px;">
            <h4 style="margin:0;">${product.name}</h4>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                <span style="font-weight:800; color:var(--secondary)">$${product.price}</span>
                <button onclick="addToCart(${product.id})" class="btn-main" style="padding:8px 15px; font-size:0.8rem; background:var(--accent);">+ Add to Cart</button>
            </div>
        </div>
    `).join('');
};

// Step 5: Add to Cart & UI Feedback
window.addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    cart.push(product);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    
    document.getElementById('cart-count-pill').innerText = cart.length;
    
    const notif = document.getElementById('sales-notif');
    document.getElementById('notif-text').innerText = `Added ${product.name} to cart!`;
    notif.style.display = 'flex';
    setTimeout(() => notif.style.display = 'none', 3000);
};

// Step 5 Extension: Remove from Cart
window.removeFromCart = (index) => {
    cart.splice(index, 1);
    localStorage.setItem('pv_cart', JSON.stringify(cart));
    renderCartUI(); // Re-render the checkout list
    document.getElementById('cart-count-pill').innerText = cart.length;
};

// Step 7: PayPal & Credit Card Integration
window.initPayPalButtons = () => {
    const container = document.getElementById("paypal-button-container");
    if (!container || container.innerHTML !== "") return; 

    paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'checkout' },
        createOrder: (data, actions) => {
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            return actions.order.create({
                purchase_units: [{ amount: { value: total.toString() } }]
            });
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(details => {
                alert('Success! Your AI Assets are ready for download.');
                cart = []; 
                localStorage.removeItem('pv_cart');
                location.reload(); 
            });
        }
    }).render('#paypal-button-container');
};

// Step 5/7: Render Checkout List
window.renderCartUI = () => {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#94a3b8;'>Your vault is empty.</p>";
        totalEl.innerText = "$0.00";
        return;
    }

    list.innerHTML = cart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:10px;">
            <span>${item.name}</span>
            <div>
                <strong>$${item.price}</strong>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ef4444; margin-left:10px; cursor:pointer;">✕</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    totalEl.innerText = `$${total.toFixed(2)}`;
};

// Intercept UI.modal to update cart content
const originalModal = window.UI.modal;
window.UI.modal = (id, action) => {
    if (id === 'checkout-overlay' && action === 'open') {
        renderCartUI();
        initPayPalButtons();
    }
    // Logic for showing/hiding
    const modal = document.getElementById(id);
    if(modal) modal.style.display = (action === 'open') ? 'flex' : 'none';
};

// Step 2: Auth Placeholder
window.handleEmailAuth = () => {
    const email = document.getElementById('email-field').value;
    if(email) {
        alert(`Welcome, ${email}!`);
        UI.modal('auth-overlay', 'close');
        document.getElementById('login-pill').innerText = "Account";
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    const searchInput = document.getElementById('vault-search');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => renderProducts(e.target.value));
    }
    document.getElementById('cart-count-pill').innerText = cart.length;
});
