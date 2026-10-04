import express from 'express';
import { generateAskAdvice, generatePlanRoadmap } from './agents.js';
import { searchMouser } from './services/mouserService.js';
import { runSpiceSimulation } from './services/spiceService.js';

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

// Mouser Component Sourcing Route
app.post('/api/mouser/search', async (req, res) => {
  try {
    const { query, tier } = req.body || {};
    const result = await searchMouser(query || '', tier || 'standard');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPICE Simulation & Transient Solver Route
app.post('/api/spice/simulate', async (req, res) => {
  try {
    const params = req.body || {};
    const result = await runSpiceSimulation(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server active on http://localhost:${PORT}`);
});