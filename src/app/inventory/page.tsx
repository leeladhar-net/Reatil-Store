'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface InventoryItem {
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
  deadStockAlert: boolean;
  status: 'Healthy' | 'Low Stock' | 'Overstock' | 'Dead Stock';
}

export default function InventoryHealth() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to fetch inventory logs');
      const data = await res.json();
      setItems(data.inventory || []);
    } catch (err: any) {
      setError(err.message || 'Error occurred fetching inventory health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Compute unique stores and categories dynamically from data
  const uniqueStores = Array.from(new Set(items.map(item => JSON.stringify({ id: item.storeId, name: item.storeName }))))
    .map(str => JSON.parse(str) as { id: string; name: string })
    .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueCategories = Array.from(new Set(items.map(item => item.category)))
    .sort();

  // Filter items based on selected parameters and search query
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStore = selectedStore === 'ALL' || item.storeId === selectedStore;
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

    return matchesSearch && matchesStore && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 space-y-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center gap-3">
          <RefreshCw size={20} className="animate-spin text-indigo-500" />
          <span className="text-sm font-medium text-zinc-300">Retrieving stock registers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 space-y-4">
        <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-2xl text-center max-w-md">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
          <h3 className="font-bold text-red-400 mb-1">Failed to Load Inventory</h3>
          <p className="text-zinc-400 text-xs mb-4">{error}</p>
          <button 
            onClick={fetchInventory}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  // Count statuses
  const counts = {
    total: filteredItems.length,
    healthy: filteredItems.filter(i => i.status === 'Healthy').length,
    lowStock: filteredItems.filter(i => i.status === 'Low Stock').length,
    overstock: filteredItems.filter(i => i.status === 'Overstock').length,
    deadStock: filteredItems.filter(i => i.status === 'Dead Stock').length,
  };

  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="text-indigo-500" size={24} />
            <span>Inventory Health Status</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Real-time health audits across store locations and product SKUs.</p>
        </div>
      </div>

      {/* Mini status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900/25 border border-zinc-800/80 p-4 rounded-xl text-center space-y-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Filtered Items</p>
          <p className="text-xl font-bold text-white">{counts.total}</p>
        </div>
        <div className="bg-emerald-950/10 border border-emerald-900/30 p-4 rounded-xl text-center space-y-1">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Healthy</p>
          <p className="text-xl font-bold text-emerald-400">{counts.healthy}</p>
        </div>
        <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl text-center space-y-1">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Low Stock</p>
          <p className="text-xl font-bold text-rose-400">{counts.lowStock}</p>
        </div>
        <div className="bg-indigo-950/10 border border-indigo-900/30 p-4 rounded-xl text-center space-y-1">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Overstock</p>
          <p className="text-xl font-bold text-indigo-400">{counts.overstock}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center space-y-1">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dead Stock</p>
          <p className="text-xl font-bold text-zinc-400">{counts.deadStock}</p>
        </div>
      </div>

      {/* Filters Control Panel */}
      <div className="bg-zinc-900/20 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search by Product Name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 pl-10 pr-4 py-2 rounded-xl text-zinc-200 text-xs placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Selector dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Filter size={14} />
              <span>Filters:</span>
            </div>

            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Stores</option>
              {uniqueStores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Overstock">Overstock</option>
              <option value="Dead Stock">Dead Stock</option>
            </select>
          </div>
        </div>

        {/* Data Grid table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
          <table className="w-full border-collapse text-left text-xs text-zinc-300 font-sans">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Store Name</th>
                <th className="py-3.5 px-4 w-28">SKU</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center w-24">Current Stock</th>
                <th className="py-3.5 px-4 text-center w-24">Sell-Through</th>
                <th className="py-3.5 px-4 text-center w-24">Days of Cover</th>
                <th className="py-3.5 px-4 text-center w-28">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-medium">
                    No matching inventory records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  let statusBadge = 'bg-zinc-800/80 text-zinc-400 border-zinc-700';

                  if (item.status === 'Healthy') {
                    statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-950/40';
                  } else if (item.status === 'Low Stock') {
                    statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-950/40';
                  } else if (item.status === 'Overstock') {
                    statusBadge = 'bg-indigo-500/10 text-indigo-400 border-indigo-950/40';
                  } else if (item.status === 'Dead Stock') {
                    statusBadge = 'bg-zinc-900 text-zinc-500 border-zinc-800';
                  }

                  const formatCover = (cover: number) => {
                    if (cover >= 999) return 'Indefinite (999+)';
                    return `${cover} days`;
                  };

                  return (
                    <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{item.storeName}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">{item.sku}</td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-200">{item.productName}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{item.category}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">
                        {item.currentStock}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-zinc-200">{item.sellThroughRate}%</span>
                          <span className="text-[9px] text-zinc-500">
                            {item.unitsSoldPeriod} sold / {item.unitsReceivedPeriod} rx
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${
                            item.daysOfCover < 7 && item.status !== 'Dead Stock' 
                              ? 'text-rose-400' 
                              : item.daysOfCover > 30 
                                ? 'text-indigo-400' 
                                : 'text-zinc-300'
                          }`}>
                            {formatCover(item.daysOfCover)}
                          </span>
                          <span className="text-[9px] text-zinc-500">
                            {item.trailing7DayVelocity} units/day
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                          {item.status}
                        </span>
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
  );
}
