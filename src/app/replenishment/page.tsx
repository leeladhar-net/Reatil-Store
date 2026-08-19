'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Package,
  Calendar,
  Sliders,
  ArrowRight,
  Info
} from 'lucide-react';

interface ReplenishmentItem {
  storeId: string;
  storeName: string;
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  unitsSoldPeriod: number;
  unitsReceivedPeriod: number;
  sellThroughRate: number;
  trailing7DayVelocity: number;
  daysOfCover: number;
  replenishmentAlert: boolean;
  suggestedReorderQuantity: number;
  status: string;
}

export default function ReplenishmentAlerts() {
  // Configurable thresholds in UI
  const [alertThreshold, setAlertThreshold] = useState(7);
  const [targetDays, setTargetDays] = useState(14);
  
  // Data states
  const [alerts, setAlerts] = useState<ReplenishmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch replenishment data based on parameters
  const fetchReplenishment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/replenishment?threshold=${alertThreshold}&target=${targetDays}`);
      if (!res.ok) throw new Error('Failed to fetch replenishment alerts');
      const data = await res.json();
      setAlerts(data.alertItems || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching replenishment data.');
    } finally {
      setLoading(false);
    }
  }, [alertThreshold, targetDays]);

  useEffect(() => {
    fetchReplenishment();
  }, [fetchReplenishment]);

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={24} />
            <span>Replenishment Alerts Tracker</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Automated restock suggestions based on daily sales velocities.</p>
        </div>
      </div>

      {/* Threshold Configuration Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Card */}
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800/80 p-5 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm border-b border-zinc-850 pb-3">
            <Sliders size={16} className="text-indigo-400" />
            <span>Configure Restocking Thresholds</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-1">
            {/* Warning Threshold Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-400">Alert Threshold</span>
                <span className="text-white px-2 py-0.5 bg-zinc-800 rounded-md">{alertThreshold} Days Cover</span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Trigger restock warnings when days of cover falls below this value.
              </p>
            </div>

            {/* Target Stock Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-400">Target Restocking Cover</span>
                <span className="text-white px-2 py-0.5 bg-indigo-650 rounded-md bg-indigo-600">{targetDays} Days Cover</span>
              </div>
              <input
                type="range"
                min="7"
                max="30"
                value={targetDays}
                onChange={(e) => setTargetDays(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Calculate reorder quantities to replenish stock up to this number of days.
              </p>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="bg-zinc-900/10 border border-zinc-800/80 p-5 rounded-2xl flex items-start gap-3">
          <Info className="text-indigo-400 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1.5 text-xs">
            <h4 className="font-bold text-zinc-200">Reordering Math</h4>
            <p className="text-zinc-400 leading-normal text-[11px]">
              Suggestions are calculated using the trailing 7-day average sales velocity.
            </p>
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-900 font-mono text-[9px] text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-300">FORMULA:</p>
              <p>Reorder Qty = (Target Days × Velocity) − Current Stock</p>
            </div>
            <p className="text-zinc-500 text-[10px]">
              * Dead Stock is excluded to prevent locking up working capital on stagnant items.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-zinc-900/20 border border-zinc-800/80 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base text-white">Critical Restocking List</h3>
            <p className="text-[11px] text-zinc-400">Items needing reorders, sorted by highest urgency first.</p>
          </div>
          <button
            onClick={fetchReplenishment}
            disabled={loading}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <p className="text-zinc-500 text-xs">Computing order sizes...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 font-semibold flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
            <Package className="mx-auto text-zinc-600" size={32} />
            <h4 className="font-bold text-zinc-400">All Stock Cover Healthy</h4>
            <p className="text-zinc-500 text-xs max-w-xs mx-auto">No store-product combinations fall below the selected {alertThreshold}-day warning threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
            <table className="w-full border-collapse text-left text-xs text-zinc-300 font-sans">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Store Name</th>
                  <th className="py-3.5 px-4 w-28">SKU</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4 text-center">Current Stock</th>
                  <th className="py-3.5 px-4 text-center">Daily Velocity</th>
                  <th className="py-3.5 px-4 text-center">Days left</th>
                  <th className="py-3.5 px-4 text-center w-40 bg-indigo-950/20 border-l border-indigo-900/40">Suggested Reorder Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {alerts.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{item.storeName}</td>
                      <td className="py-4 px-4 font-mono text-[11px] text-zinc-400">{item.sku}</td>
                      <td className="py-4 px-4 font-semibold text-zinc-200">{item.productName}</td>
                      <td className="py-4 px-4 text-center font-bold text-zinc-300">{item.currentStock}</td>
                      <td className="py-4 px-4 text-center font-semibold text-zinc-400">{item.trailing7DayVelocity} units/day</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-bold text-rose-400 px-2 py-0.5 bg-rose-950/15 border border-rose-900/30 rounded-md">
                          {item.daysOfCover} days
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-bold bg-indigo-950/10 border-l border-indigo-900/30">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-white text-sm bg-indigo-600/25 px-2.5 py-1 border border-indigo-500/20 rounded-lg">
                            {item.suggestedReorderQuantity}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-medium font-sans">units</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
