import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, List } from 'lucide-react';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6TcxaeVnrZg9k_IK9wiB4fhhmysz8NJUFUUj3ChjvMhmwdiCO32JBxS53HqlMqF4X8JjILDYvGuQx/pub?output=csv";
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

const PortfolioDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      let csvText = null;
      let lastError = null;
      
      // Try multiple CORS proxies in order
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(CSV_URL)}`,
        `https://corsproxy.io/?${encodeURIComponent(CSV_URL)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(CSV_URL)}`,
        CSV_URL // Try direct as last resort
      ];
      
      for (const proxyUrl of proxies) {
        try {
          console.log('Trying:', proxyUrl);
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            csvText = await response.text();
            if (csvText && csvText.length > 50) {
              console.log('Success with:', proxyUrl);
              break;
            }
          }
        } catch (err) {
          lastError = err;
          console.log('Failed with:', proxyUrl);
          continue;
        }
      }
      
      if (!csvText || csvText.length < 50) {
        throw new Error('Unable to fetch data from Google Sheets. All proxy methods failed.');
      }
      
      const rows = csvText.split('\n').slice(1); // Skip header
      const parsedData = rows.map(row => {
        const [Symbol, Shares, BuyPrice, BuyDate, CurrentPrice] = row.split(',');
        if (!Symbol || !Symbol.trim()) return null;

        const sharesNum = parseFloat(Shares) || 0;
        const buyPriceNum = parseFloat(BuyPrice) || 0;
        const currentPriceNum = parseFloat(CurrentPrice) || 0;
        const marketValue = sharesNum * currentPriceNum;
        const costBasis = sharesNum * buyPriceNum;

        return {
          symbol: Symbol.trim(),
          shares: sharesNum,
          buyPrice: buyPriceNum,
          currentPrice: currentPriceNum,
          marketValue,
          costBasis,
          gainLoss: marketValue - costBasis,
          returnPct: costBasis !== 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
          buyDate: BuyDate ? BuyDate.trim() : '',
        };
      }).filter(item => item !== null && item.shares > 0);

      if (parsedData.length === 0) {
        throw new Error('No valid data found in sheet');
      }

      setData(parsedData);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Cannot load data automatically. Browser security (CORS) blocks direct access to Google Sheets.');
      
      // Set demo data as fallback
      setData([
        {
          symbol: 'AAPL',
          shares: 50,
          buyPrice: 180,
          currentPrice: 195.5,
          marketValue: 9775,
          costBasis: 9000,
          gainLoss: 775,
          returnPct: 8.61,
          buyDate: '2024-12-01'
        },
        {
          symbol: 'MSFT',
          shares: 30,
          buyPrice: 370,
          currentPrice: 388.25,
          marketValue: 11647.5,
          costBasis: 11100,
          gainLoss: 547.5,
          returnPct: 4.93,
          buyDate: '2024-11-15'
        },
        {
          symbol: 'GOOGL',
          shares: 40,
          buyPrice: 140,
          currentPrice: 152.8,
          marketValue: 6112,
          costBasis: 5600,
          gainLoss: 512,
          returnPct: 9.14,
          buyDate: '2024-10-20'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const metrics = useMemo(() => {
    const totalValue = data.reduce((acc, curr) => acc + curr.marketValue, 0);
    const totalInvested = data.reduce((acc, curr) => acc + curr.costBasis, 0);
    const totalGain = totalValue - totalInvested;
    const totalReturnPct = totalInvested !== 0 ? (totalGain / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, totalGain, totalReturnPct };
  }, [data]);

  const chartData = data.map(item => ({
    name: item.symbol,
    value: item.marketValue
  })).sort((a, b) => b.value - a.value);

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="animate-spin mr-2" /> Loading Portfolio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Investment Portfolio
          </h1>
          <p className="text-slate-400 text-sm">Last updated: {lastRefreshed.toLocaleTimeString()}</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto mb-8 p-6 bg-rose-500/10 border border-rose-500/50 rounded-lg">
          <p className="font-semibold text-rose-400 mb-2">⚠️ Cannot Auto-Load Data</p>
          <p className="text-sm text-slate-300 mb-3">{error}</p>
          <div className="bg-slate-800/50 p-4 rounded-lg text-sm">
            <p className="font-semibold text-slate-200 mb-2">📋 Manual Update (takes 30 seconds):</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 ml-2">
              <li>Open your <a href="https://docs.google.com/spreadsheets/d/1-HypiBaHHoSPtSUkIOzwDGdYyV4fMV8OU5wlNHavJGs/edit" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Sheet</a></li>
              <li>Download it as CSV (File → Download → CSV)</li>
              <li>Open the CSV file and copy all content</li>
              <li>I'll add a "Paste CSV" button here for easy updates</li>
            </ol>
            <p className="text-xs text-slate-400 mt-3">Note: Browser security (CORS) prevents automatic loading from Google Sheets in artifacts</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Current Value" value={`$${metrics.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<DollarSign className="text-blue-400" />} />
        <SummaryCard title="Total Invested" value={`$${metrics.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<BarChart3 className="text-purple-400" />} />
        <SummaryCard 
          title="Unrealized Gain" 
          value={`$${metrics.totalGain.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          trend={metrics.totalGain >= 0 ? 'up' : 'down'}
          icon={metrics.totalGain >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
        />
        <SummaryCard 
          title="Total Return" 
          value={`${metrics.totalReturnPct.toFixed(2)}%`} 
          trend={metrics.totalReturnPct >= 0 ? 'up' : 'down'}
          icon={<div className={`h-2 w-2 rounded-full ${metrics.totalReturnPct >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />}
        />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Allocation Chart */}
        <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" /> Allocation
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {chartData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  {item.name}
                </span>
                <span className="text-slate-400">{((item.value / metrics.totalValue) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full Holdings Table */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <List size={18} className="text-blue-400" /> Holdings
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium text-right">Market Value</th>
                  <th className="px-6 py-4 font-medium text-right">Price</th>
                  <th className="px-6 py-4 font-medium text-right">Gain/Loss</th>
                  <th className="px-6 py-4 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {data.sort((a,b) => b.marketValue - a.marketValue).map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-400">{stock.symbol}</td>
                    <td className="px-6 py-4 text-right font-medium">${stock.marketValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-right text-slate-400">${stock.currentPrice.toFixed(2)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${stock.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.gainLoss >= 0 ? '+' : ''}{stock.returnPct.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400">
                      {((stock.marketValue / metrics.totalValue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend }) => (
  <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-900/50 rounded-lg">{icon}</div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
    <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
  </div>
);

export default PortfolioDashboard;
