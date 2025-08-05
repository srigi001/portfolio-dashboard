import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

export default function SummaryPage({ portfolios }) {
  const [visibleIds, setVisibleIds] = useState(portfolios.map((p) => p.id));

  const aggregated = useMemo(() => {
    // Filter selected portfolios with results
    const selected = portfolios.filter(
      (p) => visibleIds.includes(p.id) && p.simulationResult
    );
    if (selected.length === 0) return null;

    const months = selected[0].simulationResult.months;
    const sumArray = (arrays) =>
      arrays[0].map((_, i) =>
        arrays.reduce((sum, arr) => sum + (arr[i] || 0), 0)
      );

    // Pre-tax series
    const p10 = sumArray(
      selected.map(
        (p) => p.simulationResult.percentile10 ?? p.simulationResult.p10
      )
    );
    const p50 = sumArray(selected.map((p) => p.simulationResult.median));
    const p90 = sumArray(
      selected.map(
        (p) => p.simulationResult.percentile90 ?? p.simulationResult.p90
      )
    );

    // Post-tax series: only apply tax for pension portfolios
    const p10_after = Array(months.length).fill(0);
    const p50_after = Array(months.length).fill(0);
    const p90_after = Array(months.length).fill(0);

    selected.forEach((p) => {
      const tax = p.isPension ? 0.35 : 0;
      (p.simulationResult.percentile10 ?? p.simulationResult.p10).forEach(
        (v, i) => {
          p10_after[i] += Math.round(v * (1 - tax));
        }
      );
      p.simulationResult.median.forEach((v, i) => {
        p50_after[i] += Math.round(v * (1 - tax));
      });
      (p.simulationResult.percentile90 ?? p.simulationResult.p90).forEach(
        (v, i) => {
          p90_after[i] += Math.round(v * (1 - tax));
        }
      );
    });

    // Flag if any selected portfolio is taxed
    const hasTax = selected.some((p) => p.isPension);

    return { months, p10, p50, p90, p10_after, p50_after, p90_after, hasTax };
  }, [visibleIds, portfolios]);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(v);

  const getOption = () => {
    if (!aggregated) return {};

    const { months, p10, p50, p90, p10_after, p50_after, p90_after, hasTax } =
      aggregated;

    return {
      title: {
        text: 'Monte Carlo Summary Projection',
        left: 'center',
        top: 20,
        textStyle: { color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0]?.dataIndex || 0;
          const offset = months[idx];
          const yrs = Math.floor(offset / 12);
          const mos = offset % 12;
          const date = dayjs().add(offset, 'month');

          const titleParts = [];
          if (yrs > 0) {
            titleParts.push(`${yrs} Year${yrs !== 1 ? 's' : ''}`);
          }
          if (mos > 0) {
            titleParts.push(`${mos} Month${mos !== 1 ? 's' : ''}`);
          }
          const relativeTime = titleParts.join(' ');
          const titleDate = date.format('MMM YYYY');

          let s = `<strong>${relativeTime}</strong> (${titleDate})<br/>`;

          const formatIls = (v) =>
            `${Math.round(v).toLocaleString('en-US', {
              maximumFractionDigits: 0,
            })}₪`;

          const order = [
            { current: '50th PCT', new: 'Median' },
            { current: '10th PCT', new: '10th' },
            { current: '90th PCT', new: '90th' },
          ];

          order.forEach(({ current, new: newLabel }) => {
            const p = params.find((pt) => pt.seriesName === current);
            if (!p) return;

            const total = p.data;
            const monthly = total / 300;

            const formattedMonthly = formatIls(monthly);
            const formattedTotal = formatIls(total);

            let line;
            if (newLabel === 'Median') {
              line = `${
                p.marker
              } ${newLabel}: <strong>${formattedMonthly} safe monthly</strong> (${formattedTotal} total)`;
            } else {
              line = `${
                p.marker
              } ${newLabel}: ${formattedMonthly} safe monthly (${formattedTotal} total)`;
            }
            s += `${line}<br/>`;
          });

          return s;
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: aggregated.months.map((m) =>
          dayjs().add(m, 'month').format('MMM YYYY')
        ),
        axisLabel: { color: '#4b5563' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v) => formatCurrency(v), color: '#4b5563' },
      },
      series: [
        {
          name: '10th PCT',
          data: p10,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 },
        },
        {
          name: '50th PCT',
          data: p50,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 },
        },
        {
          name: '90th PCT',
          data: p90,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 },
        },
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100 },
      ],
    };
  };

  return (
    <div className="w-full h-full flex flex-col p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Summary</h1>
      {portfolios.length === 0 ? (
        <div className="text-gray-500">No portfolios available yet.</div>
      ) : (
        <div className="flex flex-col flex-grow">
          <div className="mb-6 space-y-2">
            {portfolios.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleIds.includes(p.id)}
                  onChange={() =>
                    setVisibleIds((prev) =>
                      prev.includes(p.id)
                        ? prev.filter((id) => id !== p.id)
                        : [...prev, p.id]
                    )
                  }
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-gray-700">{p.name}</span>
              </label>
            ))}
          </div>
          <div className="flex-grow min-h-0">
            <ReactECharts
              option={getOption()}
              style={{ height: '100%', minHeight: '500px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
