export default async function handler(req, res) {
  const { address } = req.query;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ logo: null });
  }
  try {
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=base&addresses[0]=${address}`,
      { headers: { 'X-API-Key': apiKey } }
    );
    const data = await response.json();
    const logo = Array.isArray(data) && data[0]?.logo ? data[0].logo : null;
    res.status(200).json({ logo });
  } catch (e) {
    res.status(200).json({ logo: null });
  }
}
