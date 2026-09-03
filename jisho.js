// /api/jisho.js
// Vercel Serverless Function — proxies Jisho.org lookups server-side.
//
// Why this exists: Jisho.org's API doesn't send CORS headers, so a browser
// can't call it directly from a page hosted on another origin (like your
// Vercel domain). Server-to-server requests have no CORS restrictions at
// all, so this tiny function does the fetch on Vercel's servers and hands
// the JSON back to your page from the SAME origin. No third-party proxy
// (like allorigins.win) needed, and nothing for the browser to block.
//
// Called from the client as: fetch(`/api/jisho?word=${encodeURIComponent(word)}`)

module.exports = async function handler(req, res) {
  const { word } = req.query;

  if (!word || typeof word !== 'string') {
    res.status(400).json({ error: 'Missing required "word" query parameter' });
    return;
  }

  try {
    const upstream = await fetch(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`,
      { headers: { 'User-Agent': 'mainichi-5-tango/1.0 (+vercel-serverless-proxy)' } }
    );

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Jisho responded with ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    // Cache successful lookups at the edge for a day; words don't change.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jisho', detail: String(err) });
  }
}
