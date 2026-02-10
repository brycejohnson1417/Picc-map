import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests to debug connections
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve Static Files (The React App)
app.use(express.static(path.join(__dirname, 'dist')));

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// --- NOTION PROXY ENDPOINT ---
app.all('/api/notion/*', async (req, res) => {
    const notionPath = req.params[0]; 
    const notionUrl = `https://api.notion.com/v1/${notionPath}`;
    
    const apiKey = req.headers['x-notion-token'];

    if (!apiKey) {
        console.error('Request missing x-notion-token header');
        return res.status(401).json({ error: 'Missing Notion API Key in headers' });
    }

    try {
        const options = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
        };

        // Forward body only if it's not GET/HEAD and exists
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(notionUrl, options);
        
        // Safely parse response
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Notion returned non-JSON response:', text.substring(0, 200));
            data = { 
                error: 'Upstream Error', 
                message: 'Received invalid JSON from Notion API',
                details: text 
            };
        }
        
        if (!response.ok) {
            console.error(`Notion API Error (${response.status}):`, JSON.stringify(data));
        }

        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy Server Error:', error);
        res.status(500).json({ error: 'Internal Proxy Error: ' + (error.message || 'Unknown') });
    }
});

// --- GOOGLE SHEETS PROXY ENDPOINT ---
app.get('/api/sheets/:sheetId/values/:range', async (req, res) => {
    const { sheetId, range } = req.params;
    const apiKey = req.headers['x-google-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing Google API Key' });
    }

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    try {
        const response = await fetch(sheetsUrl);
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { error: 'Invalid JSON from Google Sheets', details: text };
        }
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Sheets Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error forwarding to Google Sheets' });
    }
});

// Catch-all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Proxy endpoint ready at http://localhost:${PORT}/api/notion`);
});
