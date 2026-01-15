import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3, List } from 'lucide-react';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6TcxaeVnrZg9k_IK9wiB4fhhmysz8NJUFUUj3ChjvMhmwdiCO32JBxS53HqlMqF4X8JjILDYvGuQx/pub?output=csv";
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6'];

const PortfolioDashboard = () => {
  const [data, setData] = useState([]);
  const [portfolioInfo, setPortfolioInfo] = useState({
    startingSize: 0,
    currentSize: 0,
    monthlyPL: 0,
    monthlyPLPercent: 0,
    currentMonth: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      let csvText = null;
      
      // Try multiple CORS proxies
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(CSV_URL)}`,
        `https://corsproxy.io/?${encodeURIComponent(CSV_URL)}`,
        CSV_URL
      ];
      
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl);
          if (response.ok) {
            csvText = await response.text();
            if (csvText && csvText.length > 50) break;
          }
        } catch (err) {
          continue;
        }
      }
      
      if (!csvText || csvText.length < 50) {
        throw new Error('Unable to fetch data from Google Sheets');
      }
      
      const lines = csvText.split('\n');
      const holdings = [];
      let startingSize = 0;
      let currentSize = 0;
      let monthlyPL = 0;
      let monthlyPLPercent = 0;
      let currentMonth = '';
      
      // First, read the portfolio totals from row 2 (line index 1)
      if (lines.length > 1) {
        const row2 = lines[1].split(',');
        startingSize = parseFloat(row2[18]) || 0; // S2
        currentSize = parseFloat(row2[19]) || 0; // T2
        currentMonth = row2[21]?.trim() || ''; // V2
        monthlyPL = parseFloat(row2[22]) || 0; // W2
        monthlyPLPercent = parseFloat(row2[23]) || 0; // X2
      }
      
      // Parse each row (skip header row 0, start from row 1)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        
        // Column mapping (0-indexed)
        // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12
        const symbol = columns[0]?.trim(); // A
        const buyDate = columns[1]?.trim(); // B
        const quantity = parseFloat(columns[2]) || 0; // C
        const buyPrice = parseFloat(columns[3]) || 0; // D
        const stopLoss = parseFloat(columns[4]) || 0; // E
        const currPrice = parseFloat(columns[5]) || 0; // F
        const gainLossDollar = parseFloat(columns[6]) || 0; // G
        const gainLossPercent = parseFloat(columns[7]) || 0; // H
        const sellDate = columns[8]?.trim(); // I
        const sellPrice = parseFloat(columns[9]) || 0; // J
        const riskStock = parseFloat(columns[10]) || 0; // K
        const riskAccount = parseFloat(columns[11]) || 0; // L
        const weight = parseFloat(columns[12]) || 0; // M
        
        // Only include active positions (no sell date and has a symbol)
        if (symbol && !sellDate && quantity > 0) {
          const marketValue = quantity * currPrice;
          
          holdings.push({
            symbol,
            buyDate,
            quantity,
            buyPrice,
            currPrice,
            marketValue,
            weight, // From column M
            gainLossDollar,
            gainLossPercent,
            stopLoss,
            riskStock,
            riskAccount
          });
        }
      }
      
      setData(holdings);
      setPortfolioInfo({
        startingSize,
        currentSize,
        monthlyPL,
        monthlyPLPercent,
        currentMonth
      });
      setLastRefreshed(new Date());
      setError(null);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Cannot load data automatically. Browser security (CORS) blocks access.');
      
      // Demo data
      setData([
        {
          symbol: 'AAPL',
          buyDate: '2024-12-01',
          quantity: 50,
          buyPrice: 180,
          currPrice: 195.5,
          marketValue: 9775,
          weight: 11.7,
          gainLossDollar: 775,
          gainLossPercent: 8.61,
          stopLoss: 170,
          riskStock: 5.56,
          riskAccount: 2.78
        }
      ]);
      setPortfolioInfo({
        startingSize: 100000,
        currentSize: 105000,
        monthlyPL: 5000,
        monthlyPLPercent: 5,
        currentMonth: '1.1.26'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const metrics = useMemo(() => {
    const totalMarketValue = data.reduce((acc, curr) => acc + curr.marketValue, 0);
    const totalGainLoss = data.reduce((acc, curr) => acc + curr.gainLossDollar, 0);
    const totalInvested = portfolioInfo.currentSize - totalGainLoss;
    const overallReturn = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return { 
      totalMarketValue, 
      totalGainLoss, 
      totalInvested,
      overallReturn
    };
  }, [data, portfolioInfo]);

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
          {portfolioInfo.currentMonth && (
            <p className="text-slate-500 text-xs">Current Period: {portfolioInfo.currentMonth}</p>
          )}
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
        <div className="max-w-7xl mx-auto mb-8 p-6 bg-amber-500/10 border border-amber-500/50 rounded-lg">
          <p className="font-semibold text-amber-400 mb-2">⚠️ Showing Demo Data</p>
          <p className="text-sm text-slate-300 mb-2">{error}</p>
          <p className="text-xs text-slate-400">Deploy this to Vercel/Netlify for automatic data loading, or manually refresh your browser.</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard 
          title="Current Portfolio" 
          value={`$${portfolioInfo.currentSize.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          icon={<DollarSign className="text-blue-400" />}
          subtitle={`Started: $${portfolioInfo.startingSize.toLocaleString()}`}
        />
        <SummaryCard 
          title="Total Gain/Loss" 
          value={`$${metrics.totalGainLoss.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          trend={metrics.totalGainLoss >= 0 ? 'up' : 'down'}
          icon={metrics.totalGainLoss >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
          subtitle={`${metrics.overallReturn >= 0 ? '+' : ''}${metrics.overallReturn.toFixed(2)}%`}
        />
        <SummaryCard 
          title="Monthly P/L" 
          value={`$${portfolioInfo.monthlyPL.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          trend={portfolioInfo.monthlyPL >= 0 ? 'up' : 'down'}
          icon={portfolioInfo.monthlyPL >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
          subtitle={`${portfolioInfo.monthlyPLPercent >= 0 ? '+' : ''}${portfolioInfo.monthlyPLPercent.toFixed(2)}%`}
        />
        <SummaryCard 
          title="Active Positions" 
          value={data.length.toString()} 
          icon={<BarChart3 className="text-purple-400" />}
          subtitle={`Market Value: $${metrics.totalMarketValue.toLocaleString(undefined, {minimumFractionDigits: 0})}`}
        />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Allocation Chart */}
        <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" /> Portfolio Allocation
          </h3>
          <div className="h-64">
            {chartData.length > 0 ? (
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
                    formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data</div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {data
              .sort((a, b) => b.marketValue - a.marketValue)
              .slice(0, 5)
              .map((item, i) => {
                // Handle weight whether it's stored as decimal (0.117) or percentage (11.7)
                const displayWeight = item.weight > 1 ? item.weight : item.weight * 100;
                return (
                  <div key={item.symbol} className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                      {item.symbol}
                    </span>
                    <span className="text-slate-400">{displayWeight.toFixed(1)}%</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <List size={18} className="text-blue-400" /> Active Holdings
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                  <th className="px-6 py-4 font-medium text-right">Current Price</th>
                  <th className="px-6 py-4 font-medium text-right">Market Value</th>
                  <th className="px-6 py-4 font-medium text-right">Weight</th>
                  <th className="px-6 py-4 font-medium text-right">Gain/Loss $</th>
                  <th className="px-6 py-4 font-medium text-right">Gain/Loss %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-slate-400">
                      No active holdings. Click "Refresh Data" to load.
                    </td>
                  </tr>
                ) : (
                  data.sort((a, b) => b.marketValue - a.marketValue).map((stock) => {
                    // Handle weight whether it's stored as decimal (0.117) or percentage (11.7)
                    const displayWeight = stock.weight > 1 ? stock.weight : stock.weight * 100;
                    return (
                      <tr key={stock.symbol} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-blue-400">{stock.symbol}</td>
                        <td className="px-6 py-4 text-right">{stock.quantity}</td>
                        <td className="px-6 py-4 text-right text-slate-300">${stock.currPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-medium">${stock.marketValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-6 py-4 text-right text-slate-400">{displayWeight.toFixed(1)}%</td>
                        <td className={`px-6 py-4 text-right font-bold ${stock.gainLossDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.gainLossDollar >= 0 ? '+' : ''}${Math.abs(stock.gainLossDollar).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${stock.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.gainLossPercent >= 0 ? '+' : ''}{stock.gainLossPercent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto text-center text-slate-500 text-sm">
        <p>Portfolio tracked via Google Sheets • Data updates when you refresh</p>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend, subtitle }) => (
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
    {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
  </div>
);

export default PortfolioDashboard;