import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button } from './ui/Button';

export default function SimulationSection({
  allocations,
  oneTimeDeposits,
  monthlyChanges,
  existingResult,
  onComplete,
}) {
  const [result, setResult] = useState(existingResult || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(existingResult || null);
  }, [existingResult, allocations, oneTimeDeposits, monthlyChanges]);

  const handleRunSimulation = async () => {
    if (!allocations.length) return;
    setLoading(true);
    try {
      const response = await fetch(
        'https://investment-dashboard-backend-gm79.onrender.com/api/simulate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allocations,
            oneTimeDeposits,
            monthlyChanges,
            cycles: 15000,
            years: 15,
          }),
        }
      );
      const data = await response.json();
      setResult(data);
      onComplete(data);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    notation: 'standard',
    maximumFractionDigits: 0,
  });

  const formatDateLabel = (startDateStr, monthOffset) => {
    const date = new Date(startDateStr);
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const getOption = () => {
    if (!result || !result.mean) return {};

    const months = result.months || [];
    const startDateStr = result.simulationStartDate || '2025-01-01';

    return {
      title: {
        text: 'Monte Carlo 15Y Projection (Monthly)',
        left: 'center',
        top: 20,
        textStyle: {
          color: '#1f2937'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const monthIndex = params[0]?.dataIndex || 0;
          const date = new Date(startDateStr);
          date.setMonth(date.getMonth() + monthIndex);
          const monthYear = date.toLocaleString('default', {
            month: 'short',
            year: 'numeric',
          });
          return (
            `<strong>${monthYear}</strong><br>` +
            params
              .map((p) => `${p.seriesName}: ${currencyFormatter.format(p.value)}`)
              .join('<br>')
          );
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months.map((m) => formatDateLabel(startDateStr, m)),
        axisLabel: {
          color: '#4b5563'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => currencyFormatter.format(value),
          color: '#4b5563'
        }
      },
      series: [
        {
          name: 'Mean',
          data: result.mean,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: 'Median',
          data: result.median,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: '10th Percentile',
          data: result.percentile10,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: '90th Percentile',
          data: result.percentile90,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        }
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100 }
      ]
    };
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2 text-gray-900">Simulation</h2>
      {!result && !loading && (
        <Button onClick={handleRunSimulation}>Run Simulation</Button>
      )}
      {loading && <div className="mt-4 text-gray-700">Simulating... Please wait.</div>}
      {result && !loading && (
        <>
          <ReactECharts option={getOption()} style={{ height: 400 }} />
          <Button onClick={handleRunSimulation} className="mt-4">
            Rerun Simulation
          </Button>
        </>
      )}
    </div>
  );
}