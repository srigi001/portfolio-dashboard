import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function SummaryPage({ portfolios }) {
  const [visibleIds, setVisibleIds] = useState(portfolios.map((p) => p.id));

  const aggregated = useMemo(() => {
    const selected = portfolios.filter(
      (p) => visibleIds.includes(p.id) && p.simulationResult
    );
    if (selected.length === 0) return null;

    const months = selected[0].simulationResult.months;
    const sumArray = (arrays) =>
      arrays[0].map((_, i) =>
        arrays.reduce((sum, arr) => sum + (arr[i] || 0), 0)
      );

    const mean = sumArray(selected.map((p) => p.simulationResult.mean));
    const median = sumArray(selected.map((p) => p.simulationResult.median));
    const p10 = sumArray(
      selected.map(
        (p) => p.simulationResult.percentile10 || p.simulationResult.p10
      )
    );
    const p90 = sumArray(
      selected.map(
        (p) => p.simulationResult.percentile90 || p.simulationResult.p90
      )
    );

    return { months, mean, median, p10, p90 };
  }, [visibleIds, portfolios]);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      notation: 'standard',
      maximumFractionDigits: 0,
    }).format(v);

  const getOption = () => {
    if (!aggregated) return {};

    return {
      title: {
        text: 'Monte Carlo Summary Projection (All Portfolios)',
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
          const date = new Date();
          date.setMonth(date.getMonth() + monthIndex);
          const monthYear = date.toLocaleString('default', {
            month: 'short',
            year: 'numeric',
          });
          return (
            `<strong>${monthYear}</strong><br>` +
            params
              .map((p) => `${p.seriesName}: ${formatCurrency(p.value)}`)
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
        data: aggregated.months.map((m) => {
          const date = new Date();
          date.setMonth(date.getMonth() + m);
          return `${date.toLocaleString('default', {
            month: 'short',
          })} ${date.getFullYear()}`;
        }),
        axisLabel: {
          color: '#4b5563'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v) => formatCurrency(v),
          color: '#4b5563'
        }
      },
      series: [
        {
          name: 'Mean',
          data: aggregated.mean,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: 'Median',
          data: aggregated.median,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: '10th Percentile',
          data: aggregated.p10,
          type: 'line',
          smooth: true,
          lineStyle: { width: 2 }
        },
        {
          name: '90th Percentile',
          data: aggregated.p90,
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
    <div className="w-full h-full flex flex-col p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Summary</h1>
      {portfolios.length === 0 ? (
        <div className="text-gray-500">No portfolios available yet.</div>
      ) : (
        <div className="flex flex-col flex-grow">
          <div className="mb-6 space-y-2">
            {portfolios.map((p) => (
              <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleIds.includes(p.id)}
                  onChange={() => {
                    setVisibleIds((prev) =>
                      prev.includes(p.id)
                        ? prev.filter((id) => id !== p.id)
                        : [...prev, p.id]
                    );
                  }}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-gray-700">{p.name}</span>
              </label>
            ))}
          </div>
          {aggregated ? (
            <div className="flex-grow min-h-0">
              <ReactECharts
                option={getOption()}
                style={{ height: '100%', minHeight: '500px' }}
              />
            </div>
          ) : (
            <div className="text-gray-500 mt-4">
              No completed simulations for selected portfolios.
            </div>
          )}
        </div>
      )}
    </div>
  );
}