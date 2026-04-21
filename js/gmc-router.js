(async function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const gmcId = params.get('product');
    if (!gmcId) return;

    const res = await fetch('/products.json');
    const products = await res.json();
    const product = products.find(p => p.gmc_id === gmcId);
    
    if (!product) {
      console.warn(`GMC ID ${gmcId} not found in products.json`);
      return;
    }

    const mappedId = product.id;

    // Force URL to /vault with mapped ID
    params.set('product', mappedId);
    const newUrl = `/vault?${params.toString()}`;
    
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }

    // Show the browse page + scroll - THIS IS THE FIX
    const showAndScroll = () => {
      // Your app uses changePage, not PV.router
      if (window.changePage) {
        window.changePage('browse', null); // 'browse' is your product page ID
      }
      
      setTimeout(() => {
        const el = document.querySelector(`[data-id="${mappedId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.outline = '2px solid #00ff88';
          setTimeout(() => el.style.outline = '', 2000);
        }
      }, 1200); // Give app time to render products
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showAndScroll);
    } else {
      showAndScroll();
    }

  } catch (e) {
    console.error("Auto Router Error:", e);
  }
})();
