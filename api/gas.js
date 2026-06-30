export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const gasUrl = process.env.GASWEBAPPURL || process.env['GAS_WEB_APP_URL'] || 'https://script.google.com/macros/s/AKfycby2Zk6Cl6vTr1YTf8zCRjAodngMz9SwlqzyHM4Ygt-cDtYF8nCQWiJlGshQVCkGX-pvAA/exec';

  try {
    let body = '';
    if (req.method === 'POST') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(gasUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: req.method === 'POST' ? body : undefined
    });

    const data = await response.text();
    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      json = data;
    }

    return res.status(response.status).json(json);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
