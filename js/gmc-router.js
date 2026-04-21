(async function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const gmcId = params.get('product');
    if (!gmcId) return;

    // Fetch your updated product database
    const res = await fetch('/products.json');
    const products = await res.json();

    // Find matching product by GMC ID
    const product = products.find(p => p.gmc_id === gmcId);
    if (!product) {
      console.warn(`GMC ID ${gmcId} not found in products.json`);
      return;
    }
    
    const mappedId = product.id;

    // Update URL to site ID without reload (SEO friendly)
    params.set('product', mappedId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Ensure the page is ready before scrolling
    window.addEventListener('DOMContentLoaded', () => {
      // Trigger the 'browse' view if your app uses a router
      if (window.PV && PV.router) {
        PV.router.go('browse');
      }
      
      // Smooth scroll to the specific product card
      setTimeout(() => {
        const el = document.querySelector(`[data-id="${mappedId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1000); // Increased to 1s for better reliability on PH mobile networks
    });
  } catch (e) {
    console.error("Auto Router Error:", e);
  }
})();
