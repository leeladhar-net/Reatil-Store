'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TrendItem {
  date: string;
  storeId: string;
  category: string;
  unitsSold: number;
}

interface ChartProps {
  data: TrendItem[];
  selectedStore: string;
  selectedCategory: string;
}

export default function StockMovementChart({ data, selectedStore, selectedCategory }: ChartProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch for Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[320px] bg-zinc-900/20 animate-pulse rounded-2xl flex items-center justify-center border border-zinc-800/80">
        <span className="text-zinc-500 text-sm">Loading visualization...</span>
      </div>
    );
  }

  // 1. Filter data based on props
  const filteredData = data.filter((item) => {
    const storeMatch = selectedStore === 'ALL' || item.storeId === selectedStore;
    const categoryMatch = selectedCategory === 'ALL' || item.category === selectedCategory;
    return storeMatch && categoryMatch;
  });

  // 2. Aggregate units sold by date
  const aggregatedMap: Record<string, number> = {};
  filteredData.forEach((item) => {
    aggregatedMap[item.date] = (aggregatedMap[item.date] || 0) + item.unitsSold;
  });

  // Convert to chart array format and sort by date
  const chartData = Object.entries(aggregatedMap)
    .map(([date, units]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rawDate: date,
      'Units Sold': units
    }))
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  // Custom tooltips to fit our premium theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 px-4 py-3 rounded-xl shadow-2xl text-xs font-sans">
          <p className="text-zinc-400 font-semibold mb-1.5">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <p className="text-zinc-200">
              Units Sold: <span className="font-bold text-white text-sm">{payload[0].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[320px]">
      {chartData.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-sm">No transaction history match for filters.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Units Sold"
              stroke="#818cf8"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorUnits)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
