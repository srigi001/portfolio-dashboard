import React from 'react';
import AllocationsSection from './AllocationsSection';
import OneTimeDepositsSection from './OneTimeDepositsSection';
import MonthlyDepositsSection from './MonthlyDepositsSection';
import SimulationSection from './SimulationSection';
import { fetchAssetData } from '../utils/calcMetrics';

export default function PortfolioPage({ portfolio, updatePortfolio }) {
  // Centralized updater
  const update = (patch) => updatePortfolio({ ...portfolio, ...patch });

  // Section update handlers
  const handleAllocationsUpdate = (allocations) => {
    update({ allocations, simulationResult: null });
  };
  const handleOneTimeDepositsUpdate = (oneTimeDeposits) => {
    update({ oneTimeDeposits, simulationResult: null });
  };
  const handleMonthlyChangesUpdate = (monthlyChanges) => {
    update({ monthlyChanges, simulationResult: null });
  };

  // Toggle "Is Pension"
  const handlePensionToggle = () => {
    update({ isPension: !portfolio.isPension });
  };

  // Run simulation (propagates loading state)
  const runSimulation = async () => {
    console.log('🚀 Starting simulation...');
    update({ isSimulating: true });
    try {
      const payload = {
        allocations: portfolio.allocations.map((a) => ({
          allocation: a.allocation,
          cagr:
            a.cagrType === '10Y'
              ? a.cagr10Y
              : a.cagrType === 'Blended'
              ? a.cagrBlended
              : a.cagr5Y,
          volatility:
            a.cagrType === '10Y'
              ? a.volatility10Y
              : a.cagrType === 'Blended'
              ? a.volatilityBlended
              : a.volatility5Y,
        })),
        oneTimeDeposits: portfolio.oneTimeDeposits,
        monthlyChanges: portfolio.monthlyChanges,
      };

      console.log('📊 Simulation payload:', payload);
      console.log('📊 Allocations being sent:', payload.allocations);
      console.log('📊 One-time deposits:', payload.oneTimeDeposits);
      console.log('📊 Monthly changes:', payload.monthlyChanges);

      const res = await fetch(
        'https://investment-dashboard-backend-gm79.onrender.com/api/simulate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      console.log('📡 Simulation response status:', res.status);
      
      if (!res.ok) {
        const err = await res.json();
        console.error('❌ Simulation API error:', err);
        throw new Error(err.error || 'Simulation failed');
      }
      
      const result = await res.json();
      console.log('✅ Simulation result received:', result);
      console.log('📊 Result percentiles:', {
        '10th': result.percentiles?.['10']?.length || 0,
        '50th': result.percentiles?.['50']?.length || 0,
        '90th': result.percentiles?.['90']?.length || 0
      });
      
      update({ simulationResult: result, isSimulating: false });
    } catch (e) {
      console.error('❌ Simulation error:', e);
      update({ isSimulating: false });
    }
  };

  return (
    <div>
      {/* Header with title and pension toggle */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{portfolio.name}</h1>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!portfolio.isPension}
            onChange={handlePensionToggle}
            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Is Pension</span>
        </label>
      </div>

      <AllocationsSection
        allocations={portfolio.allocations}
        setAllocations={handleAllocationsUpdate}
        fetchAssetData={fetchAssetData}
      />

      <OneTimeDepositsSection
        deposits={portfolio.oneTimeDeposits}
        setDeposits={handleOneTimeDepositsUpdate}
      />

      <MonthlyDepositsSection
        changes={portfolio.monthlyChanges}
        setChanges={handleMonthlyChangesUpdate}
      />

      <SimulationSection
        allocations={portfolio.allocations}
        oneTimeDeposits={portfolio.oneTimeDeposits}
        monthlyChanges={portfolio.monthlyChanges}
        existingResult={portfolio.simulationResult}
        isPension={portfolio.isPension}
        loading={!!portfolio.isSimulating}
        onRun={runSimulation}
      />
    </div>
  );
}
