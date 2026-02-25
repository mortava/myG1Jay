const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint
app.post('/api/chat', async (req, res) => {
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
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'obagent1' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`obagent1 running at http://localhost:${PORT}`);
    });
}

module.exports = app;
