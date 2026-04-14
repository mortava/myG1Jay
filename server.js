const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://tql-broker-ai-chat-1094393703267.us-central1.run.app';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
    const message = (req.body && (req.body.message || req.body.content)) || '';
    let sessionId = req.body && req.body.sessionId;

    try {
        if (!sessionId) {
            const sessResp = await fetch(`${API_BASE}/api/backend/ai/chat/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const sessData = await sessResp.json();
            sessionId = sessData.id;
        }

        const streamResp = await fetch(`${API_BASE}/api/backend/ai/chat/messages/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
            body: JSON.stringify({ session_id: sessionId, message })
        });
        await streamResp.text();

        let reply = '';
        let references = [];
        const start = Date.now();
        while (Date.now() - start < 55000) {
            const r = await fetch(`${API_BASE}/api/backend/ai/chat/sessions/${sessionId}`);
            const data = await r.json();
            const msgs = data.messages || [];
            const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
            if (lastAssistant && lastAssistant.content) {
                reply = lastAssistant.content;
                references = lastAssistant.references || [];
                break;
            }
            await new Promise(r => setTimeout(r, 1500));
        }

        if (!reply) return res.status(504).json({ error: 'Timeout', sessionId });
        res.json({ reply, message: reply, response: reply, sessionId, references });
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: 'Proxy request failed', message: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'quinn-ai-agent' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`quinn running at http://localhost:${PORT}`);
    });
}

module.exports = app;
