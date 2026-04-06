/**
 * PROJECT MEMORY: UI & UX Service
 * Responsibility: Notifications, Cart UI updates, and Navigation logic.
 */

export const UIService = {
    /**
     * Replaces standard alerts with a sleek, non-intrusive notification.
     * @param {string} text - The message to display.
     * @param {string} type - 'success' (green) or 'info' (default).
     */
    showNotification: (text, type = 'info') => {
        const notif = document.getElementById('sales-notif');
        const textEl = document.getElementById('notif-text');
        
        if (!notif || !textEl) {
            console.warn("UI Service: Notification elements not found in HTML.");
            return;
        }
        
        textEl.innerText = text;
        notif.style.display = 'flex';
        
        // Dynamic styling based on message type
        notif.style.borderColor = type === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)';
        notif.style.boxShadow = type === 'success' ? '0 0 20px rgba(34, 197, 94, 0.2)' : 'none';
        
        // Auto-hide after 4 seconds
        setTimeout(() => { 
            notif.style.display = 'none'; 
        }, 4000);
    },

    /**
     * Synchronizes the Cart Pill and Total Price across the entire app.
     */
    refreshCartUI: () => {
        const cart = JSON.parse(localStorage.getItem('pv_cart')) || [];
        const pill = document.getElementById('cart-count-pill');
        const totalEl = document.getElementById('cart-total');
        
        // Update the 🛒 count
        if (pill) {
            pill.innerText = cart.length;
            pill.style.display = cart.length > 0 ? 'block' : 'none';
        }

        // Update the checkout total
        if (totalEl) {
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            totalEl.innerText = `$${total.toFixed(2)}`;
        }
    },

    /**
     * Standardized page switching logic.
     * @param {string} id - The ID of the page div to show.
     * @param {HTMLElement} el - The nav item clicked (optional).
     */
    changePage: (id, el) => {
        // 1. Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // 2. Show target page
        const target = document.getElementById(id);
        if (target) target.classList.add('active');

        // 3. Update Nav UI
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (el) el.classList.add('active');

        // 4. Special handling for Library sync
        if (id === 'library' && window.loadUserLibrary) {
            window.loadUserLibrary();
        }
    }
};
