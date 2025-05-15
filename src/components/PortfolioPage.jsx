import AllocationsSection from './AllocationsSection';
import OneTimeDepositsSection from './OneTimeDepositsSection';
import MonthlyDepositsSection from './MonthlyDepositsSection';
import SimulationSection from './SimulationSection';

export default function PortfolioPage({ portfolio, updatePortfolio }) {
  const fetchAssetData = async (symbol) => {
    try {
      const [priceRes, profileRes] = await Promise.all([
        fetch(`https://yfinance-backend.onrender.com/api/price-history?symbol=${symbol}&period=5y`),
        fetch(`https://yfinance-backend.onrender.com/api/profile?symbol=${symbol}`)
      ]);

      const priceData = await priceRes.json();
      const profileData = await profileRes.json();

      if (!priceData.prices || priceData.prices.length < 2) {
        throw new Error('Not enough price data');
      }

      const firstPrice = priceData.prices[0];
      const lastPrice = priceData.prices[priceData.prices.length - 1];
      const years = 5;
      const cagr = Math.pow(lastPrice / firstPrice, 1 / years) - 1;

      const returns = priceData.prices
        .slice(1)
        .map((p, i) => (p - priceData.prices[i]) / priceData.prices[i]);
      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance =
        returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
        (returns.length - 1);
      const volatility = Math.sqrt(variance) * Math.sqrt(252);

      const description =
        profileData?.longBusinessSummary ||
        profileData?.shortName ||
        profileData?.symbol ||
        'Unknown Company';

      return { cagr, volatility, description };
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}`, error);
      throw new Error(`Unable to fetch data for ${symbol}`);
    }
  };

  const handleAllocationsUpdate = (allocations) => {
    updatePortfolio({
      ...portfolio,
      allocations,
      simulationResult: null,
    });
  };

  const handleOneTimeDepositsUpdate = (oneTimeDeposits) => {
    updatePortfolio({
      ...portfolio,
      oneTimeDeposits,
      simulationResult: null,
    });
  };

  const handleMonthlyChangesUpdate = (monthlyChanges) => {
    updatePortfolio({
      ...portfolio,
      monthlyChanges,
      simulationResult: null,
    });
  };

  const handleSimulationComplete = (simulationResult) => {
    updatePortfolio({
      ...portfolio,
      simulationResult,
    });
  };

  return (
    <div>
      <h1 className="text-2xl mb-4">{portfolio.name}</h1>
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
        onComplete={handleSimulationComplete}
      />
    </div>
  );
}