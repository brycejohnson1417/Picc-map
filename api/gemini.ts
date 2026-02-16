import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from './_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY environment variable');
    return res.status(500).json({
      error: 'Server configuration error: Missing Gemini API Key',
      message: 'Please set GEMINI_API_KEY in your Vercel environment variables'
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(message);
    const response = result.response;
    const text = response.text();

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: 'Failed to generate response',
      message: (error as Error).message
    });
  }
}
