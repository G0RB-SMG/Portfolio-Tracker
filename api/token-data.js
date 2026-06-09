const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req, res) {
  const { address } = req.query;
  console.log('[token-data] address:', address);

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  const key   = address.toLowerCase();
  const entry = cache.get(key);
  const now   = Date.now();

  if (entry && (now - entry.ts) < CACHE_TTL) {
    console.log('[token-data] cache hit');
    return res.status(200).json(entry.data);
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  console.log('[token-data] COINGECKO_API_KEY present:', !!apiKey, '| length:', apiKey?.length ?? 0);

  const headers = { accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  const url = `https://api.coingecko.com/api/v3/coins/base/contract/${address}`;
  console.log('[token-data] fetching:', url);

  let responseText;
  try {
    const response = await fetch(url, { headers });
    responseText = await response.text();
    console.log('[token-data] status:', response.status);
    console.log('[token-data] body:', responseText.slice(0, 500));

    if (!response.ok) return res.status(200).json(null);

    const data = JSON.parse(responseText);
    const md   = data.market_data || {};
    const result = {
      rank:              data.market_cap_rank            || null,
      marketCap:         md.market_cap?.usd              || null,
      fdv:               md.fully_diluted_valuation?.usd || null,
      circulatingSupply: md.circulating_supply           || null,
    };
    cache.set(key, { data: result, ts: now });
    console.log('[token-data] result:', JSON.stringify(result));
    res.status(200).json(result);
  } catch (e) {
    console.error('[token-data] error:', e.message);
    res.status(200).json(null);
  }
}
