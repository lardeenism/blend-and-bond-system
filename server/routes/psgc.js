import express from 'express';

const router = express.Router();

const PSGC_BASE = 'https://psgc.cloud/api';

// Bohol province code from PSGC
const BOHOL_CODE = '0701200000';

// Allowed municipalities (Calape, Loon, Tubigon)
const ALLOWED_MUNICIPALITIES = ['calape', 'loon', 'tubigon'];

// In-memory cache to reduce API calls
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function cachedFetch(url) {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  // Retry logic — up to 3 attempts
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`PSGC API returned ${response.status}`);
      const data = await response.json();
      cache.set(url, { data, timestamp: now });
      return data;
    } catch (err) {
      lastErr = err;
      // Wait before retry (exponential backoff)
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ==========================================
// BOHOL-SPECIFIC ENDPOINTS (used by checkout)
// ==========================================

// GET /api/psgc/bohol/municipalities — returns only Calape, Loon, Tubigon
router.get('/bohol/municipalities', async (req, res) => {
  try {
    const data = await cachedFetch(`${PSGC_BASE}/provinces/${BOHOL_CODE}/municipalities`);
    const allItems = Array.isArray(data) ? data : [];
    // Filter to allowed municipalities only
    const filtered = allItems.filter(m =>
      ALLOWED_MUNICIPALITIES.includes(m.name.toLowerCase())
    );
    res.json(filtered);
  } catch (err) {
    console.error('PSGC Bohol municipalities error:', err);
    res.status(500).json({ error: 'Failed to fetch municipalities. Please try again.' });
  }
});

// GET /api/psgc/bohol/municipalities/:code/barangays
router.get('/bohol/municipalities/:code/barangays', async (req, res) => {
  try {
    // Try municipalities endpoint first, fallback to cities
    let data;
    try {
      data = await cachedFetch(`${PSGC_BASE}/municipalities/${req.params.code}/barangays`);
    } catch {
      data = await cachedFetch(`${PSGC_BASE}/cities/${req.params.code}/barangays`);
    }
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('PSGC barangays error:', err);
    res.status(500).json({ error: 'Failed to fetch barangays. Please try again.' });
  }
});

// ==========================================
// GENERIC ENDPOINTS (kept for compatibility)
// ==========================================

// GET /api/psgc/provinces
router.get('/provinces', async (req, res) => {
  try {
    const data = await cachedFetch(`${PSGC_BASE}/provinces`);
    res.json(data);
  } catch (err) {
    console.error('PSGC provinces error:', err);
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

// GET /api/psgc/provinces/:code/municipalities
router.get('/provinces/:code/municipalities', async (req, res) => {
  try {
    const data = await cachedFetch(`${PSGC_BASE}/provinces/${req.params.code}/municipalities`);
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('PSGC municipalities error:', err);
    res.status(500).json({ error: 'Failed to fetch municipalities' });
  }
});

// GET /api/psgc/municipalities/:code/barangays
router.get('/municipalities/:code/barangays', async (req, res) => {
  try {
    const data = await cachedFetch(`${PSGC_BASE}/municipalities/${req.params.code}/barangays`);
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('PSGC barangays error:', err);
    res.status(500).json({ error: 'Failed to fetch barangays' });
  }
});

// Also support cities
router.get('/cities/:code/barangays', async (req, res) => {
  try {
    const data = await cachedFetch(`${PSGC_BASE}/cities/${req.params.code}/barangays`);
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch barangays' });
  }
});

export default router;
