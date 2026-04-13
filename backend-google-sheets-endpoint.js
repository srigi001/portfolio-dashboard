// Updated server.js for Render deployment

import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets API setup with environment variable support
let sheets = null;

try {
  // Try to use environment variables first (for Render deployment)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API initialized with environment variables');
  } else {
    // Fallback to key file (for local development)
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API initialized with key file');
  }
} catch (error) {
  console.warn('⚠️ Google Sheets API not available:', error.message);
  sheets = null;
}

// Google Sheets endpoint
app.post('/api/google-sheets', async (req, res) => {
  try {
    if (!sheets) {
      return res.status(500).json({ 
        error: 'Google Sheets API not configured',
        details: 'Please set up Google service account credentials'
      });
    }

    const { spreadsheetId, range = 'Sheet1!A:Z' } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID is required' });
    }

    console.log(`📊 Fetching Google Sheets data: ${spreadsheetId}, range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    console.log(`✅ Retrieved ${rows.length} rows from Google Sheets`);

    res.json({
      success: true,
      rows,
      spreadsheetId,
      range
    });

  } catch (error) {
    console.error('❌ Google Sheets API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Google Sheets data',
      details: error.message 
    });
  }
});

// Your existing simulation endpoint
app.post('/api/simulate', (req, res) => {
  console.log('🚀 Backend: Simulation request received');
  try {
    const { allocations, oneTimeDeposits, monthlyChanges, cycles = 15000, years = 15 } = req.body;

    console.log('📊 Backend: Allocations received:', allocations);
    console.log('📊 Backend: One-time deposits:', oneTimeDeposits);
    console.log('📊 Backend: Monthly changes:', monthlyChanges);

    if (!allocations.length) {
      console.log('❌ Backend: No allocations provided');
      return res.status(400).json({ error: 'No allocations provided' });
    }

    // Determine simulation start date and total months
    const allDates = [
      ...oneTimeDeposits.map((d) => d.date),
      ...monthlyChanges.map((d) => d.date),
    ].sort();

    const firstDepositDateStr = allDates.length > 0 ? allDates[0] : new Date().toISOString().slice(0, 10);
    const firstDepositDate = new Date(firstDepositDateStr);
    const totalMonths = years * 12;

    const getMonthIndex = (dateStr) => {
      const d = new Date(dateStr);
      return (d.getFullYear() - firstDepositDate.getFullYear()) * 12 + (d.getMonth() - firstDepositDate.getMonth());
    };

    // Pre-process deposits into a deterministic monthly map
    const monthlyDepositsMap = new Float64Array(totalMonths + 1).fill(0);
    oneTimeDeposits.forEach(d => {
      const idx = getMonthIndex(d.date);
      if (idx >= 0 && idx <= totalMonths) monthlyDepositsMap[idx] += d.amount;
    });
    monthlyChanges.forEach(d => {
      const startIdx = getMonthIndex(d.date);
      for (let i = Math.max(0, startIdx); i <= totalMonths; i++) {
        monthlyDepositsMap[i] += d.amount;
      }
    });

    // Calculate deterministic invested curve
    const investedCurve = new Float64Array(totalMonths + 1);
    let runningInvested = 0;
    for (let t = 0; t <= totalMonths; t++) {
      runningInvested += monthlyDepositsMap[t];
      investedCurve[t] = runningInvested;
    }

    console.log('📊 Backend: Simulation parameters:', {
      firstDepositDate: firstDepositDateStr,
      totalMonths,
      cycles,
      years
    });

    const allPaths = [];
    const dt = 1 / 12;

    for (let i = 0; i < cycles; i++) {
      const path = new Float64Array(totalMonths + 1);
      let balance = 0;

      for (let t = 0; t <= totalMonths; t++) {
        // 1. Add deposits for this month
        balance += monthlyDepositsMap[t];

        if (t > 0 && balance > 0) {
          // 2. Growth from previous month using Geometric Brownian Motion (Log-normal)
          allocations.forEach((asset) => {
            const r = asset.cagr;
            const sigma = asset.volatility;
            const weight = (asset.allocation / 100);
            
            // Simplified drift/diffusion for the blended weighted portfolio
            const drift = (r - 0.5 * sigma * sigma) * dt;
            const diffusion = sigma * Math.sqrt(dt) * randn_bm();
            balance *= Math.exp((drift + diffusion) * weight);
          });
        }
        path[t] = balance;
      }
      allPaths.push(path);
    }

    // Aggregate paths into percentiles
    const aggregated = [];
    for (let month = 0; month <= totalMonths; month++) {
      const monthValues = allPaths.map((path) => path[month]).sort((a, b) => a - b);
      const mean = monthValues.reduce((sum, v) => sum + v, 0) / monthValues.length;
      
      aggregated.push({
        month,
        mean: isNaN(mean) ? 0 : mean,
        median: monthValues[Math.floor(cycles * 0.5)],
        p10: monthValues[Math.floor(cycles * 0.1)],
        p30: monthValues[Math.floor(cycles * 0.3)],
        p70: monthValues[Math.floor(cycles * 0.7)],
        p90: monthValues[Math.floor(cycles * 0.9)],
      });
    }

    const result = {
      simulationStartDate: firstDepositDateStr,
      months: aggregated.map((r) => r.month),
      mean: aggregated.map((r) => Math.round(r.mean)),
      median: aggregated.map((r) => Math.round(r.median)),
      percentile10: aggregated.map((r) => Math.round(r.p10)),
      percentile30: aggregated.map((r) => Math.round(r.p30)),
      percentile70: aggregated.map((r) => Math.round(r.p70)),
      percentile90: aggregated.map((r) => Math.round(r.p90)),
      invested: Array.from(investedCurve).map(v => Math.round(v))
    };

    console.log('✅ Backend: Simulation completed successfully');
    res.json(result);
  } catch (e) {
    console.error('Simulation error:', e);
    res.status(500).json({ error: 'Simulation error' });
  }
});

function randn_bm() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
}); 