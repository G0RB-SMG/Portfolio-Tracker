// Module-level cache survives across warm container reuses on Vercel
const cache = new Map(); // lc(address) → { data, ts }
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 min
const CALL_DELAY_MS    = 300; // ~3 req/sec, safely under CoinGecko's burst limit

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function cgFetch(address, apiKey) {
  const headers = { accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  const url = `https://api.coingecko.com/api/v3/coins/base/contract/${address}`;
  const resp  = await fetch(url, { headers });
  const text  = await resp.text();

  console.log(`[cg-batch] ${address.slice(0,10)} → ${resp.status} ${text.slice(0,80)}`);

  if (text.includes('Throttled') || resp.status === 429) return { throttled: true };
  if (!resp.ok) return { throttled: false, data: null };

  const json = JSON.parse(text);
  const md   = json.market_data || {};
  return {
    throttled: false,
    data: {
      rank:              json.market_cap_rank          || null,
      marketCap:         md.market_cap?.usd            || null,
      fdv:               md.fully_diluted_valuation?.usd || null,
      circulatingSupply: md.circulating_supply         || null,
    }
  };
}

export default async function handler(req, res) {
  const raw       = (req.query.addresses || '').slice(0, 8000); // guard against abuse
  const addresses = raw.split(',')
    .map(a => a.trim())
    .filter(a => /^0x[0-9a-fA-F]{40}$/.test(a))
    .slice(0, 50); // hard cap — 50 × 300ms = 15s max, within Vercel Pro; hobby users rarely have 50 tokens

  if (!addresses.length) return res.status(400).json({ error: 'No valid addresses' });

  const apiKey  = process.env.COINGECKO_API_KEY;
  const now     = Date.now();
  const results = {};
  let   firstFetch = true;

  console.log(`[cg-batch] ${addresses.length} addresses, apiKey=${!!apiKey}`);

  for (const addr of addresses) {
    const key   = addr.toLowerCase();
    const entry = cache.get(key);

    // Return from server cache if fresh
    if (entry && (now - entry.ts) < SERVER_CACHE_TTL) {
      results[addr] = entry.data;
      continue;
    }

    // Space out real CoinGecko calls
    if (!firstFetch) await sleep(CALL_DELAY_MS);
    firstFetch = false;

    try {
      const { throttled, data } = await cgFetch(addr, apiKey);

      if (throttled) {
        // Serve stale cache rather than returning null
        results[addr] = entry ? entry.data : null;
        console.log(`[cg-batch] throttled for ${addr.slice(0,10)}, stale=${!!entry}`);
      } else {
        results[addr] = data;
        if (data) cache.set(key, { data, ts: now });
      }
    } catch (e) {
      console.error(`[cg-batch] fetch error ${addr.slice(0,10)}: ${e.message}`);
      results[addr] = entry ? entry.data : null;
    }
  }

  res.status(200).json(results);
}
