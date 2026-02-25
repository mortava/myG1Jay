const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS headers - allow embedding from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_URL = 'https://grow.g1wins.com/api/pricing-engine/ai/chat?public=true';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'obagent1/1.0'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message
        });
    }
};
