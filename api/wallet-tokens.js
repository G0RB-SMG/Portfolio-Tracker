export default async function handler(req, res) {
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MORALIS_API_KEY not configured on server' });
  }
  try {
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base`,
      { headers: { 'X-API-Key': apiKey } }
    );
    const data = await response.json();
    if (!Array.isArray(data)) {
      return res.status(502).json({ error: data.message || 'Moralis API error' });
    }
    const tokens = data
      .filter(t => parseFloat(t.balance) > 0)
      .map(t => ({
        symbol: t.symbol,
        address: t.token_address,
        balance: parseFloat(t.balance) / Math.pow(10, parseInt(t.decimals) || 18),
        logo: t.logo || t.thumbnail || null
      }));
    res.status(200).json(tokens);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Request failed' });
  }
}
