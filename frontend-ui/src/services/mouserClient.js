/**
 * Frontend Client for Mouser Component Sourcing API
 */

export async function searchMouserComponent(query = '', tier = 'standard') {
  try {
    const response = await fetch('/api/mouser/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, tier })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`[Mouser Client] Sourcing lookup for "${query}" failed:`, err.message);
    return {
      success: false,
      source: 'offline-fallback',
      results: []
    };
  }
}

export async function enrichBomWithMouser(rawBom = [], tier = 'standard') {
  if (!rawBom || rawBom.length === 0) return { enrichedBom: [], source: 'catalog-cache' };

  let detectedSource = 'catalog-cache';

  const enrichedPromises = rawBom.map(async (item) => {
    const searchQuery = item.mpn || item.part_number || item.description || item.name || '';
    const lookup = await searchMouserComponent(searchQuery, tier);

    if (lookup.success && lookup.results && lookup.results.length > 0) {
      if (lookup.source === 'mouser-api') {
        detectedSource = 'mouser-api';
      }
      const matched = lookup.results[0];
      return {
        ...item,
        mpn: matched.mpn || item.mpn,
        manufacturer: matched.manufacturer || item.manufacturer || 'Standard OEM',
        description: matched.description || item.description,
        package: matched.package || item.package || 'SMD',
        footprint: matched.footprint || item.footprint || 'Standard',
        price: matched.price || item.price || '$--',
        unit_price: matched.unit_price || item.unit_price || item.price || '$--',
        stock: matched.stock || matched.inStock || 'In Stock',
        inStock: matched.inStock || matched.stock || 'In Stock',
        leadTime: matched.leadTime || 'Immediate',
        detailUrl: matched.detailUrl || `https://www.mouser.com/c/?q=${encodeURIComponent(item.mpn || '')}`,
        source: lookup.source
      };
    }

    // Default fallback formatting
    return {
      ...item,
      manufacturer: item.manufacturer || 'Standard OEM',
      stock: item.stock || 'Available in Stock',
      detailUrl: item.detailUrl || `https://www.mouser.com/c/?q=${encodeURIComponent(item.mpn || '')}`
    };
  });

  const enrichedBom = await Promise.all(enrichedPromises);
  return { enrichedBom, source: detectedSource };
}
