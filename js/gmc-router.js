(async function () {
  try {
    if (!window.location.search) return;

    const params = new URLSearchParams(window.location.search);
    const gmcId = params.get('product');
    if (!gmcId) return;

    // Use force-cache to speed up product lookups for returning users
    const res = await fetch('/products.json', { cache: 'force-cache' });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch products.json: HTTP ${res.status}`);
    }

    const products = await res.json();
    const product = products.find(p => p.gmc_id === gmcId);
    
    if (!product) {
      console.warn(`[GMC Router] GMC ID '${gmcId}' not found in products.json. Proceeding to standard page.`);
      return;
    }

    // Redirect directly to the product's destination page
    // Using replace() prevents the routing URL from polluting the 'Back' button history
    if (product.slug) {
      window.location.replace(`/vault/${product.slug}.html`);
    } else {
      console.error(`[GMC Router] Product ID '${product.id}' is missing a slug mapping.`);
    }

  } catch (e) {
    console.error(`[GMC Router] Execution Error:`, e);
  }
})();
