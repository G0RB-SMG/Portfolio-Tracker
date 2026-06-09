export default async function handler(req, res) {
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = { accept: 'application/json' };
  if (apiKey) {
    // Support both Demo and Pro key header names
    headers['x-cg-demo-api-key'] = apiKey;
    headers['x-cg-pro-api-key'] = apiKey;
  }
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/base/contract/${address}`,
      { headers }
    );
    if (!response.ok) return res.status(200).json(null);
    const data = await response.json();
    const md = data.market_data || {};
    res.status(200).json({
      rank: data.market_cap_rank || null,
      marketCap: md.market_cap?.usd || null,
      fdv: md.fully_diluted_valuation?.usd || null,
      circulatingSupply: md.circulating_supply || null
    });
  } catch (e) {
    res.status(200).json(null);
  }
}
