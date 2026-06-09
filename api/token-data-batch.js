const cache = new Map(); // lc(address) → { data, ts }
const SERVER_CACHE_TTL  = 5 * 60 * 1000; // 5 min
const CALL_DELAY_MS     = 800;  // ~1.2 req/sec, comfortably under CoinGecko demo 30/min
const THROTTLE_RETRY_MS = 3000; // wait 3s and retry once before giving up

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function cgFetch(address, apiKey) {
  const headers = { accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  const url  = `https://api.coingecko.com/api/v3/coins/base/contract/${address}`;
  const resp = await fetch(url, { headers });
  const text = await resp.text();

  console.log(`[cg-batch] ${address.slice(0,10)} → ${resp.status} | ${text.slice(0,120)}`);

  if (text.includes('Throttled') || resp.status === 429) return { throttled: true };
  if (!resp.ok) return { throttled: false, data: null };

  const json = JSON.parse(text);
  const md   = json.market_data || {};
  return {
    throttled: false,
    data: {
      rank:              json.market_cap_rank              || null,
      marketCap:         md.market_cap?.usd                || null,
      fdv:               md.fully_diluted_valuation?.usd   || null,
      circulatingSupply: md.circulating_supply             || null,
    }
  };
}

export default async function handler(req, res) {
  const raw       = (req.query.addresses || '').slice(0, 8000);
  const addresses = raw.split(',')
    .map(a => a.trim())
    .filter(a => /^0x[0-9a-fA-F]{40}$/.test(a))
    .slice(0, 20); // 20 × 800ms = 16s max; enough for large portfolios on Vercel Pro

  if (!addresses.length) return res.status(400).json({ error: 'No valid addresses' });

  const apiKey  = process.env.COINGECKO_API_KEY;
  const now     = Date.now();
  const results = {};
  let   firstFetch = true;

  console.log(`[cg-batch] START: ${addresses.length} addresses, apiKey=${!!apiKey}`);
  console.log(`[cg-batch] addresses: ${addresses.map(a => a.slice(0,10)).join(', ')}`);

  for (const addr of addresses) {
    const key   = addr.toLowerCase();
    const entry = cache.get(key);

    if (entry && (now - entry.ts) < SERVER_CACHE_TTL) {
      results[key] = entry.data; // always store under lowercase key
      console.log(`[cg-batch] cache hit: ${addr.slice(0,10)}`);
      continue;
    }

    if (!firstFetch) await sleep(CALL_DELAY_MS);
    firstFetch = false;

    try {
      let { throttled, data } = await cgFetch(addr, apiKey);

      if (throttled) {
        console.log(`[cg-batch] throttled, retrying ${addr.slice(0,10)} in ${THROTTLE_RETRY_MS}ms...`);
        await sleep(THROTTLE_RETRY_MS);
        const retry = await cgFetch(addr, apiKey);
        throttled = retry.throttled;
        data      = retry.data;
      }

      if (throttled) {
        results[key] = entry ? entry.data : null;
        console.log(`[cg-batch] still throttled after retry, stale=${!!entry}: ${addr.slice(0,10)}`);
      } else {
        results[key] = data;
        if (data) cache.set(key, { data, ts: now });
      }
    } catch (e) {
      console.error(`[cg-batch] error ${addr.slice(0,10)}: ${e.message}`);
      results[key] = entry ? entry.data : null;
    }
  }

  console.log(`[cg-batch] RESPONSE: ${JSON.stringify(results).slice(0, 500)}`);
  res.status(200).json(results);
}
