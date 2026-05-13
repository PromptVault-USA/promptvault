// ... existing imports ...

const productsToSync = [];

fs.createReadStream('products.csv') // <-- Changed to your main products.csv
  .pipe(csv())
  .on('data', (row) => {
    const clean = (val) => val?.toString().trim() || '';
    
    // Fallback to 'id' if 'gmc_id' doesn't exist
    const baseOfferId = clean(row.gmc_id) || clean(row.id);

    // Hardcode an infinite effective date, or you can map this dynamically if added later
    const rawSaleDate = '2026-01-01T00:00:00-07:00/2026-12-31T23:59:59-07:00';
    const cleanSaleDate = rawSaleDate;

    TARGET_COUNTRIES.forEach(country => {
      if (country === 'KR' || country === 'KP') return;

      const uniqueOfferId = `${baseOfferId}_${country.toLowerCase()}`;

      // Convert relative paths like /assets/images/ to absolute CDN URLs
      let absoluteImage = clean(row.img);
      if (absoluteImage.startsWith('/')) {
        absoluteImage = `https://promptvaultusa.shop${absoluteImage}`;
      }

      productsToSync.push({
        offerId: uniqueOfferId,
        title: clean(row.name), // mapped to main CSV 'name' column
        description: clean(row.desc), // mapped to main CSV 'desc' column
        link: `https://promptvaultusa.shop/vault/${clean(row.slug)}.html`,
        imageLink: absoluteImage, // mapped to main CSV 'img'
        contentLanguage: 'en',
        targetCountry: country,
        feedLabel: country, 
        channel: 'online',
        price: {
          value: clean(row.price).replace(/[^0-9.]/g, '') || '0',
          currency: 'USD'
        },
        salePrice: {
          value: clean(row.sale_price).replace(/[^0-9.]/g, '') || '0',
          currency: 'USD'
        },
        salePriceEffectiveDate: cleanSaleDate,
        condition: 'new',
        availability: 'in stock',
        brand: 'PromptVault USA',
        googleProductCategory: '5827', 
        identifierExists: 'no',
        shipping: [{
          country: country,
          service: 'Standard',
          price: { value: '0', currency: 'USD' }
        }]
      });
    });
  })
  .on('end', async () => {
    console.log(`🚀 Starting Batched Sync: ${productsToSync.length} listings for ID: ${merchantId}`);
    
    // ... remainder of the batch push code remains the exact same ...
