/**
 * Serverless Function (Vercel) for Secure Daily.co Room Creation
 * Keeps DAILY_API_KEY safe on the server: never exposed to client browsers
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.DAILY_API_KEY || process.env.VITE_DAILY_API_KEY;
  const domain = (process.env.DAILY_DOMAIN || process.env.VITE_DAILY_DOMAIN || 'daksh-s.daily.co')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  const roomName = (req.query.name || req.body?.name || '').trim();

  // Validate room name strictly to prevent injection or malicious naming
  if (!roomName || !/^tbi-[a-zA-Z0-9_-]{1,60}$/.test(roomName)) {
    return res.status(400).json({
      error: 'Invalid room name. Must match pattern: tbi-[a-zA-Z0-9_-]',
    });
  }

  if (!apiKey) {
    // Fallback: return default predictable URL if no key configured
    return res.status(200).json({ url: `https://${domain}/${roomName}` });
  }

  try {
    // 1. Check if room exists
    const checkRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      return res.status(200).json({ url: data.url });
    }

    // 2. Create room with 7-day expiration and chat enabled
    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_chat: true,
          enable_screenshare: false,
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        },
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      return res.status(200).json({ url: createData.url });
    }

    const errText = await createRes.text();
    console.error('[API /daily-room] Daily API error:', errText);
    return res.status(200).json({ url: `https://${domain}/${roomName}` });
  } catch (err) {
    console.error('[API /daily-room] Exception:', err);
    return res.status(200).json({ url: `https://${domain}/${roomName}` });
  }
}
