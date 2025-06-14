import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

/**
 * Props:
 * - allocations: Array<{ allocation, cagrType, cagr5Y, cagr10Y, cagrBlended, volatility5Y, volatility10Y, volatilityBlended }>
 * - oneTimeDeposits: Array<{ id, amount, date }>
 * - monthlyChanges: Array<{ id, amount, date }>
 * - existingResult: {
 *     simulationStartDate: string,
 *     months: number[],
 *     median: number[],
 *     percentile10: number[],
 *     percentile90: number[]
 *   }
 * - isPension: boolean
 * - loading: boolean
 * - onRun: () => void
 */
export default function SimulationSection({
  allocations,
  oneTimeDeposits,
  monthlyChanges,
  existingResult,
  isPension,
  loading,
  onRun,
}) {
  // Determine tax rate: pension=35%, otherwise 0%
  const taxRate = isPension ? 0.35 : 0;

  // Pick the right metric
  const pickCagr = (a) =>
    a.cagrType === '10Y'
      ? a.cagr10Y
      : a.cagrType === 'Blended'
      ? a.cagrBlended
      : a.cagr5Y;
  const pickVol = (a) =>
    a.cagrType === '10Y'
      ? a.volatility10Y
      : a.cagrType === 'Blended'
      ? a.volatilityBlended
      : a.volatility5Y;

  // Build chart option
  const option = useMemo(() => {
    if (!existingResult) return null;
    const { simulationStartDate, months, median, percentile10, percentile90 } = existingResult;

    // Generate X-axis labels
    const start = new Date(simulationStartDate);
    const labels = months.map((m) => {
      const d = new Date(start);
      d.setMonth(d.getMonth() + m);
      return d.toLocaleString('default', { month: 'short', year: 'numeric' });
    });

    // Define display order
    const order = ['Median', '10th PCT', '90th PCT'];

    return {
      toolbox: {
        feature: { dataZoom: { yAxisIndex: false }, restore: {}, saveAsImage: {} },
      },
      dataZoom: [
        { type: 'slider', start: 0, end: 100 },
        { type: 'inside', start: 0, end: 100 },
      ],
      xAxis: { type: 'category', data: labels, axisPointer: { type: 'shadow' } },
      yAxis: { type: 'value', axisLabel: { formatter: (v) => `₪${v.toLocaleString()}` } },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const offset = months[idx];
          const yrs = Math.floor(offset / 12);
          const mos = offset % 12;
          const label = labels[idx];

          let s = `<strong>${yrs} Years${mos ? ` ${mos} Months` : ''} (${label})</strong><br/>`;

          order.forEach((seriesName) => {
            const p = params.find((pt) => pt.seriesName === seriesName);
            if (!p) return;
            const total = p.data;
            const afterTax = Math.round(total * (1 - taxRate));
            const monthly = Math.round((afterTax * 0.04) / 12);

            let line = `${p.marker} <strong>${seriesName}:</strong> ₪${monthly.toLocaleString()} safe monthly (₪${total.toLocaleString()}`;
            if (taxRate > 0) {
              line += ` / ₪${afterTax.toLocaleString()} after tax`;
            }
            line += `)`;

            s += `${line}<br/>`;
          });

          return s;
        },
      },
      series: [
        { name: '10th PCT', data: percentile10, type: 'line', showSymbol: true },
        { name: 'Median', data: median, type: 'line', showSymbol: true },
        { name: '90th PCT', data: percentile90, type: 'line', showSymbol: true },
      ],
    };
  }, [existingResult, isPension]);

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Simulation</h2>
      <Button onClick={onRun} disabled={loading}>
        {loading ? 'Running...' : 'Run Simulation'}
      </Button>
      {option && <ReactECharts option={option} style={{ height: '400px' }} />}
    </Card>
  );
}
