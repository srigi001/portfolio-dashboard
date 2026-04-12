/**
 * Local Monte Carlo Portfolio Simulation
 */

/**
 * Standard normal distribution using Box-Muller transform
 */
function nextGaussian() {
  const u = 1 - Math.random(); 
  const v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Run a Monte Carlo simulation locally
 * 
 * @param {Object} payload 
 * @param {Array} payload.allocations - [{ allocation: 100, cagr: 0.08, volatility: 0.15 }]
 * @param {Array} payload.oneTimeDeposits - [{ date: 'YYYY-MM-DD', amount: 1000 }]
 * @param {Array} payload.monthlyChanges - [{ date: 'YYYY-MM-DD', amount: 100 }]
 * @param {number} payload.years - Number of years to simulate
 * @param {number} iterations - Number of simulations to run (default 1000)
 */
export function simulatePortfolio(payload, iterations = 1000) {
  const { allocations, oneTimeDeposits = [], monthlyChanges = [], years = 10 } = payload;
  const numMonths = years * 12;
  
  // Weighted average CAGR and volatility
  let totalCagr = 0;
  let totalVol = 0;
  allocations.forEach(a => {
    const weight = a.allocation / 100;
    totalCagr += a.cagr * weight;
    totalVol += a.volatility * weight;
  });

  const r_annual = totalCagr;
  const sigma_annual = totalVol;
  const dt = 1 / 12;
  
  // Pre-process deposits into a monthly map for fast lookup
  // Start date is normalized to the current month's start
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth(); // 0-11
  
  const getMonthIndex = (dateStr) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth();
    return (y - startYear) * 12 + (m - startMonth);
  };

  const monthlyDepositsMap = new Array(numMonths + 1).fill(0);
  
  oneTimeDeposits.forEach(d => {
    const idx = getMonthIndex(d.date);
    if (idx >= 0 && idx <= numMonths) {
      monthlyDepositsMap[idx] += d.amount;
    }
  });

  // Monthly changes (recurring)
  // The UI currently provides "Start Date" for monthly deposits.
  // We assume the deposit repeats every month from that date onwards.
  monthlyChanges.forEach(d => {
    const startIdx = getMonthIndex(d.date);
    if (startIdx <= numMonths) {
      for (let i = Math.max(0, startIdx); i <= numMonths; i++) {
        monthlyDepositsMap[i] += d.amount;
      }
    }
  });

  // Store results for all iterations
  const allRuns = Array.from({ length: iterations }, () => new Float64Array(numMonths + 1));

  for (let iter = 0; iter < iterations; iter++) {
    let balance = 0;
    allRuns[iter][0] = balance; // Index 0 is "now"
    
    for (let t = 0; t <= numMonths; t++) {
      // 1. Add deposits for this month (applied at the beginning of the month)
      balance += monthlyDepositsMap[t];
      
      if (t > 0) {
        // 2. Grow the balance from previous month
        // Balance at end of month t = Balance at start of month t * e^((r - 0.5*sigma^2)dt + sigma*sqrt(dt)*Z)
        const drift = (r_annual - 0.5 * sigma_annual * sigma_annual) * dt;
        const diffusion = sigma_annual * Math.sqrt(dt) * nextGaussian();
        balance *= Math.exp(drift + diffusion);
      }
      
      allRuns[iter][t] = balance;
    }
  }

  // Calculate percentiles for each month
  const result = {
    months: Array.from({ length: numMonths + 1 }, (_, i) => i),
    mean: new Array(numMonths + 1),
    median: new Array(numMonths + 1),
    percentile10: new Array(numMonths + 1),
    percentile30: new Array(numMonths + 1),
    percentile70: new Array(numMonths + 1),
    percentile90: new Array(numMonths + 1),
  };

  for (let t = 0; t <= numMonths; t++) {
    const tValues = allRuns.map(run => run[t]).sort((a, b) => a - b);
    
    result.percentile10[t] = tValues[Math.floor(iterations * 0.1)];
    result.percentile30[t] = tValues[Math.floor(iterations * 0.3)];
    result.median[t] = tValues[Math.floor(iterations * 0.5)];
    result.percentile70[t] = tValues[Math.floor(iterations * 0.7)];
    result.percentile90[t] = tValues[Math.floor(iterations * 0.9)];
    
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += tValues[i];
    result.mean[t] = sum / iterations;
  }

  return result;
}
