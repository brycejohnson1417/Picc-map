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

// Serve Static Files (The React App)
app.use(express.static(path.join(__dirname, 'dist')));

// --- NOTION PROXY ENDPOINT ---
app.all('/api/notion/*', async (req, res) => {
    const notionPath = req.params[0]; 
    const notionUrl = `https://api.notion.com/v1/${notionPath}`;
    
    const apiKey = req.headers['x-notion-token'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing Notion API Key' });
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

        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(notionUrl, options);
        const data = await response.json();
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error forwarding to Notion' });
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
        const data = await response.json();
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
