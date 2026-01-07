/**
 * Parse product text and extract product names with prices
 * Handles formats like:
 * - Product Name
 * $129.00
 * - Product Name (Description)
 * $159.00
 */
export function parseProductsFromText(text) {
  const products = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Skip headers and section titles
  const skipPatterns = [
    /^(View|Photography|Drone|Video|Matterport|Floorplans|Rush|THESE|Same|Oversize|Exterior|Interior)/i,
    /Comparison/i,
    /Examples/i,
    /Extras/i,
    /Options/i,
    /RATES/i,
    /DO NOT/i,
    /^This value/i,
    /^THESE RATES/i,
    /^Same Day/i,
    /^Oversize/i,
    /^Lot Outlines/i,
    /^1 Drone/i,
    /^2 Drone/i,
    /^Cinematic/i,
    /^Matterport Tour/i,
    /^Standard/i,
    /^Simplified/i,
    /^Commercial/i,
    /^Include/i,
    /^\d+ Oversize/i,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if it matches skip patterns
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }
    
    // Check if line contains a price (format: $XXX.XX)
    const priceMatch = line.match(/\$([\d,]+\.?\d*)/);
    
    if (priceMatch) {
      // Extract price and convert to number
      const priceStr = priceMatch[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      
      if (!isNaN(price) && price > 0 && i > 0) {
        // Use previous line as product name
        const productName = lines[i - 1];
        
        // Validate product name
        if (productName && 
            !productName.match(/\$/) && // Not a price line
            !skipPatterns.some(pattern => pattern.test(productName)) && // Not a header
            productName.length > 2 && // Has meaningful length
            !productName.match(/^\d+$/) && // Not just a number
            !productName.match(/^[A-Z\s]{3,}$/)) { // Not all caps header
          
          // Check if product already exists (avoid duplicates)
          const exists = products.some(p => 
            p.name.toLowerCase() === productName.toLowerCase()
          );
          
          if (!exists) {
            products.push({
              name: productName.replace(/\s+/g, ' ').trim(),
              price: price,
              description: '',
            });
          }
        }
      }
    }
  }
  
  // Filter out products without prices and clean up
  return products
    .filter(p => p.price !== null && p.price > 0 && p.name.length > 2)
    .map(p => ({
      name: p.name.replace(/\s+/g, ' ').trim(),
      price: p.price,
      description: p.description || '',
    }));
}

