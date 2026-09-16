import express from 'express';
import { generateAskAdvice, generatePlanRoadmap } from './agents.js';

const app = express();
const PORT = 5000;

app.use(express.json());

// Enable CORS for frontend Vite requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Ask Route
app.post('/api/ask', async (req, res) => {
  try {
    const { user_prompt } = req.body;
    const data = await generateAskAdvice(user_prompt || '');
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Plan Route
app.post('/api/plan', async (req, res) => {
  try {
    const { user_prompt } = req.body;
    const data = await generatePlanRoadmap(user_prompt || '');
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server active on http://localhost:${PORT}`);
});