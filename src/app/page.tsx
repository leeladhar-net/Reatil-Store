'use client';

import { useState, useEffect } from 'react';
import { 
  Coins, 
  ShoppingBag, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  MapPin,
  Trophy,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import StockMovementChart from '@/components/StockMovementChart';

interface DashboardStats {
  totalRevenue: number;
  totalUnitsSold: number;
  averageSellThrough: number;
  activeAlertsCount: number;
}

interface StoreData {
  storeId: string;
  storeName: string;
  city: string;
  type: string;
  revenue: number;
  unitsSold: number;
  sellThroughRate: number;
  inventoryTurnover: number;
  performanceScore: number;
  rank: number;
}

interface TrendItem {
  date: string;
  storeId: string;
  category: string;
  unitsSold: number;
}

interface AIInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export default function Dashboard() {
  // Page Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  
  // Loading & Error States
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightsCached, setInsightsCached] = useState(false);

  // Filter States
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Fetch Dashboard core data
  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const data = await res.json();
      setStats(data.dashboard);
      setStores(data.stores);
      setTrends(data.trends);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching dashboard data.');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch or regenerate AI insights
  const fetchInsights = async (force = false) => {
    try {
      setLoadingInsights(true);
      const res = await fetch(`/api/insights${force ? '?force=true' : ''}`);
      if (!res.ok) throw new Error('Failed to fetch AI insights');
      const data = await res.json();
      setInsights(data.insights || []);
      setInsightsCached(data.cached ?? false);
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchInsights();
  }, []);

  if (loadingData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 space-y-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center gap-3">
          <RefreshCw size={20} className="animate-spin text-indigo-500" />
          <span className="text-sm font-medium text-zinc-300">Retrieving retail metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 space-y-4">
        <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-center max-w-md">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
          <h3 className="font-bold text-red-400 mb-1">Database Load Failed</h3>
          <p className="text-zinc-400 text-xs mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Retail Analytics</h1>
          <p className="text-xs text-zinc-400 mt-1">D2C Footwear brand Neeman&apos;s sales performance &amp; inventory intelligence.</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-[10px] font-semibold text-zinc-400 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>LATEST DATA GENERATION ACTIVE</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Revenue */}
          <div className="bg-zinc-900/35 border border-zinc-800/80 p-5 rounded-2xl space-y-3 hover:border-zinc-700/50 transition-colors group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Revenue (75d)</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                <Coins size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-semibold">
                <ArrowUpRight size={12} className="text-emerald-500" />
                <span className="text-emerald-500">Overperforming</span>
                <span>vs projection</span>
              </div>
            </div>
          </div>

          {/* Units Sold */}
          <div className="bg-zinc-900/35 border border-zinc-800/80 p-5 rounded-2xl space-y-3 hover:border-zinc-700/50 transition-colors group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Units Sold</span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalUnitsSold.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-semibold">
                <span>Across 6 stores and 25 SKUs</span>
              </div>
            </div>
          </div>

          {/* Sell-Through */}
          <div className="bg-zinc-900/35 border border-zinc-800/80 p-5 rounded-2xl space-y-3 hover:border-zinc-700/50 transition-colors group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sell-Through Rate</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                <TrendingUp size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.averageSellThrough}%</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-semibold">
                <span>Opening + received units sold</span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-zinc-900/35 border border-zinc-800/80 p-5 rounded-2xl space-y-3 hover:border-zinc-700/50 transition-colors group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Replenishment Alerts</span>
              <div className={`p-2 rounded-xl transition-colors duration-300 ${
                stats.activeAlertsCount > 0 
                  ? 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white' 
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                <AlertCircle size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.activeAlertsCount}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 font-semibold">
                <span className={stats.activeAlertsCount > 0 ? 'text-rose-400' : 'text-zinc-500'}>
                  {stats.activeAlertsCount > 0 ? 'Urgent restocking needed' : 'All stores fully covered'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Analytics Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (Left & Center) */}
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800/80 p-6 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-base text-white">Stock Movement Trend</h3>
              <p className="text-[11px] text-zinc-400">Daily sales quantity movement over a 75-day period.</p>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Stores</option>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Sneakers">Sneakers</option>
                <option value="Loafers">Loafers</option>
                <option value="Sandals">Sandals</option>
                <option value="Boots">Boots</option>
                <option value="Slip-ons">Slip-ons</option>
              </select>
            </div>
          </div>

          <StockMovementChart 
            data={trends} 
            selectedStore={selectedStore} 
            selectedCategory={selectedCategory} 
          />
        </div>

        {/* AI Insights Widget (Right Panel) */}
        <div className="bg-zinc-900/20 border border-zinc-800/80 p-6 rounded-2xl flex flex-col h-full space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">AI Insights Panel</h3>
                <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">Gemini Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => fetchInsights(true)}
              disabled={loadingInsights}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-colors disabled:opacity-40"
              title="Regenerate Insights"
            >
              <RefreshCw size={14} className={loadingInsights ? 'animate-spin text-indigo-400' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[260px] pr-1">
            {loadingInsights ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3.5 py-12">
                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                <p className="text-zinc-500 text-xs font-medium">Analyzing sales velocity matrices...</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 py-12 border border-dashed border-zinc-800 rounded-2xl">
                <p className="text-zinc-500 text-xs">No insights generated yet.</p>
                <button
                  onClick={() => fetchInsights(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Generate Insights
                </button>
              </div>
            ) : (
              insights.map((insight, idx) => {
                let badgeColor = 'bg-zinc-800 border-zinc-700 text-zinc-400';
                let indicatorDot = 'bg-zinc-500';

                if (insight.type === 'warning') {
                  badgeColor = 'bg-rose-500/5 border-rose-950/40 text-rose-300';
                  indicatorDot = 'bg-rose-500';
                } else if (insight.type === 'success') {
                  badgeColor = 'bg-emerald-500/5 border-emerald-950/40 text-emerald-300';
                  indicatorDot = 'bg-emerald-500';
                } else if (insight.type === 'info') {
                  badgeColor = 'bg-amber-500/5 border-amber-950/40 text-amber-300';
                  indicatorDot = 'bg-amber-500';
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border flex flex-col gap-1.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 ${badgeColor}`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <span className={`w-1.5 h-1.5 rounded-full ${indicatorDot}`} />
                      <span>{insight.title}</span>
                    </div>
                    <p className="text-zinc-400 leading-normal text-[11px] font-medium">{insight.description}</p>
                  </div>
                );
              })
            )}
          </div>
          {insights.length > 0 && (
            <div className="text-[10px] text-zinc-500 flex justify-between items-center font-medium bg-zinc-900/20 p-2 rounded-lg border border-zinc-800/40">
              <span>Status: {insightsCached ? 'Cached' : 'Generated Fresh'}</span>
              <button 
                onClick={() => fetchInsights(true)} 
                className="text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Store Leaderboard Grid */}
      <div className="bg-zinc-900/20 border border-zinc-800/80 p-6 rounded-2xl space-y-4">
        <div>
          <h3 className="font-bold text-base text-white">Store Performance Leaderboard</h3>
          <p className="text-[11px] text-zinc-400">Stores ranked by composite score based on Revenue (50%), Sell-Through % (30%), and Turnover (20%).</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/10">
          <table className="w-full border-collapse text-left text-xs text-zinc-300 font-sans">
            <thead>
              <tr className="bg-zinc-950/40 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 text-center w-12">Rank</th>
                <th className="py-3.5 px-4">Store Name</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Revenue (75d)</th>
                <th className="py-3.5 px-4 text-center">Sell-Through Rate</th>
                <th className="py-3.5 px-4 text-center">Inventory Turnover</th>
                <th className="py-3.5 px-4 text-center w-24">Perf Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {stores.map((store) => {
                let badgeClass = 'bg-zinc-800 text-zinc-300';
                if (store.type === 'flagship') badgeClass = 'bg-indigo-950 text-indigo-400 border border-indigo-900/50';
                if (store.type === 'outlet') badgeClass = 'bg-zinc-900 text-zinc-400 border border-zinc-800';

                const isTopStore = store.rank === 1;
                const isWorstStore = store.rank === stores.length;

                return (
                  <tr 
                    key={store.storeId} 
                    className={`hover:bg-zinc-900/30 transition-colors ${
                      isTopStore 
                        ? 'bg-emerald-950/5' 
                        : isWorstStore 
                          ? 'bg-rose-950/5' 
                          : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-center font-bold">
                      {store.rank === 1 ? (
                        <div className="flex justify-center text-amber-500">
                          <Trophy size={16} />
                        </div>
                      ) : (
                        <span>{store.rank}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-white flex items-center gap-1.5">
                      <span>{store.storeName}</span>
                      {isTopStore && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-1.5 py-0.5 rounded-md">Top</span>
                      )}
                      {isWorstStore && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/30 border border-rose-900/50 px-1.5 py-0.5 rounded-md">Laggard</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-zinc-400 font-medium">{store.city}</td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${badgeClass}`}>
                        {store.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-white">
                      ₹{store.revenue.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center font-semibold">{store.sellThroughRate}%</td>
                    <td className="py-4 px-4 text-center font-semibold text-zinc-400">{store.inventoryTurnover}x</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              isTopStore 
                                ? 'bg-emerald-500' 
                                : isWorstStore 
                                  ? 'bg-rose-500' 
                                  : 'bg-indigo-500'
                            }`}
                            style={{ width: `${store.performanceScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-white text-[11px]">{store.performanceScore}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
