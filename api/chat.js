const fetch = require('node-fetch');

const API_BASE = 'https://tql-broker-ai-chat-hpcz4nbaaq-uc.a.run.app';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const message = (req.body && (req.body.message || req.body.content)) || '';
    let sessionId = req.body && req.body.sessionId;

    try {
        if (!sessionId) {
            const sessResp = await fetch(`${API_BASE}/api/backend/ai/chat/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
        const streamText = await streamResp.text();

        // Parse SSE for an error event so we surface the real upstream failure
        for (const line of streamText.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
                const evt = JSON.parse(line.slice(5).trim());
                if (evt.event === 'error' && evt.error) {
                    console.error('Upstream stream error:', evt.error);
                    return res.status(502).json({
                        error: 'Upstream AI error',
                        message: evt.error,
                        sessionId
                    });
                }
            } catch {}
        }

        const pollSession = async () => {
            const r = await fetch(`${API_BASE}/api/backend/ai/chat/sessions/${sessionId}`);
            return r.json();
        };

        let reply = '';
        let references = [];
        const start = Date.now();
        while (Date.now() - start < 55000) {
            const data = await pollSession();
            const msgs = data.messages || [];
            const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
            if (lastAssistant && lastAssistant.content) {
                reply = lastAssistant.content;
                references = lastAssistant.references || [];
                break;
            }
            await new Promise(r => setTimeout(r, 1500));
        }

        if (!reply) {
            return res.status(504).json({ error: 'Timeout waiting for assistant reply', sessionId });
        }

        res.json({ reply, message: reply, response: reply, sessionId, references });
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: 'Proxy request failed', message: error.message });
    }
};
