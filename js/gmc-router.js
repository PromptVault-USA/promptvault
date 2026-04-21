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

    // Redirect directly to the product's HTML page
    if (product.slug) {
      window.location.replace(`/vault/${product.slug}.html`);
    } else {
      console.error(`Product ${product.id} missing slug in products.json`);
    }

  } catch (e) {
    console.error("Auto Router Error:", e);
  }
})();
