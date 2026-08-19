import { prisma } from './db';

export interface StoreMetrics {
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

export interface InventoryItemMetrics {
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

export interface DashboardSummary {
  totalRevenue: number;
  totalUnitsSold: number;
  averageSellThrough: number;
  activeAlertsCount: number;
}

// Global cached metrics to avoid calculating on every route hit, since SQLite is local
// and data is static after seeding.
let cachedStoreMetrics: StoreMetrics[] = [];
let cachedInventoryMetrics: InventoryItemMetrics[] = [];
let cachedDashboardSummary: DashboardSummary | null = null;
let lastCalculatedTime: number = 0;

const CACHE_DURATION = 10 * 1000; // 10 seconds cache

export async function calculateAllMetrics(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedInventoryMetrics.length > 0 && now - lastCalculatedTime < CACHE_DURATION) {
    return {
      dashboard: cachedDashboardSummary!,
      stores: cachedStoreMetrics,
      inventory: cachedInventoryMetrics
    };
  }

  // 1. Get max date in DB to find current day
  const maxDateRecord = await prisma.dailyInventorySales.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true }
  });

  if (!maxDateRecord) {
    throw new Error('No data found in the database. Please seed the database first.');
  }

  const maxDate = maxDateRecord.date;
  const maxDateString = maxDate.toISOString();

  // Find date range for trailing velocities
  const trailing7DaysAgo = new Date(maxDate);
  trailing7DaysAgo.setUTCDate(maxDate.getUTCDate() - 6); // inclusive of maxDate

  const trailing30DaysAgo = new Date(maxDate);
  trailing30DaysAgo.setUTCDate(maxDate.getUTCDate() - 29); // 30 days trailing

  // Fetch all stores, products, and sales logs in memory for efficient processing
  const stores = await prisma.store.findMany();
  const products = await prisma.product.findMany();
  const salesRecords = await prisma.dailyInventorySales.findMany({
    include: {
      product: true,
      store: true
    }
  });

  const productMap = new Map(products.map(p => [p.sku, p]));
  const storeMap = new Map(stores.map(s => [s.id, s]));

  // Get current day records (on maxDate)
  const currentDayRecords = salesRecords.filter(
    r => r.date.toISOString().split('T')[0] === maxDateString.split('T')[0]
  );
  const currentDayMap = new Map(
    currentDayRecords.map(r => [`${r.storeId}_${r.sku}`, r])
  );

  // Group transactions by storeId and sku to compute period metrics
  const storeSkuGroups: Record<string, typeof salesRecords> = {};
  const storeGroups: Record<string, typeof salesRecords> = {};

  for (const record of salesRecords) {
    const key = `${record.storeId}_${record.sku}`;
    if (!storeSkuGroups[key]) storeSkuGroups[key] = [];
    storeSkuGroups[key].push(record);

    if (!storeGroups[record.storeId]) storeGroups[record.storeId] = [];
    storeGroups[record.storeId].push(record);
  }

  // 2. Compute SKU x Store Inventory Metrics
  const inventoryMetrics: InventoryItemMetrics[] = [];

  for (const store of stores) {
    for (const prod of products) {
      const key = `${store.id}_${prod.sku}`;
      const group = storeSkuGroups[key] || [];
      if (group.length === 0) continue;

      // Current stock is closing stock on maxDate
      const currentDayRecord = currentDayMap.get(key);
      const currentStock = currentDayRecord ? currentDayRecord.closingStock : 0;

      // Period aggregates (75 days)
      let unitsSoldPeriod = 0;
      let unitsReceivedPeriod = 0;
      
      // Sort group by date to find first opening stock
      group.sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstOpeningStock = group[0].openingStock;

      // Trailing sales
      let sales7Days = 0;
      let sales30Days = 0;

      for (const rec of group) {
        unitsSoldPeriod += rec.unitsSold;
        unitsReceivedPeriod += rec.unitsReceived;

        const recTime = rec.date.getTime();
        if (recTime >= trailing7DaysAgo.getTime() && recTime <= maxDate.getTime()) {
          sales7Days += rec.unitsSold;
        }
        if (recTime >= trailing30DaysAgo.getTime() && recTime <= maxDate.getTime()) {
          sales30Days += rec.unitsSold;
        }
      }

      // Sell-through rate
      const sellThroughRate = (unitsSoldPeriod / (firstOpeningStock + unitsReceivedPeriod)) * 100;

      // Trailing 7-day velocity
      const trailing7DayVelocity = sales7Days / 7;

      // Days of stock cover
      let daysOfCover = 999; // default cover if sales velocity is 0
      if (trailing7DayVelocity > 0) {
        daysOfCover = currentStock / trailing7DayVelocity;
      } else if (currentStock === 0) {
        daysOfCover = 0;
      }

      // Alerts
      const replenishmentAlert = daysOfCover < 7;
      const deadStockAlert = sales30Days === 0 && currentStock > 0;

      // Determine Status
      let status: InventoryItemMetrics['status'] = 'Healthy';
      if (deadStockAlert) {
        status = 'Dead Stock';
      } else if (currentStock === 0 || replenishmentAlert) {
        status = 'Low Stock';
      } else if (currentStock > 60 && daysOfCover > 30) {
        // High stock and high days cover
        status = 'Overstock';
      }

      inventoryMetrics.push({
        storeId: store.id,
        storeName: store.name,
        sku: prod.sku,
        productName: prod.name,
        category: prod.category,
        currentStock,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        unitsSoldPeriod,
        unitsReceivedPeriod,
        sellThroughRate: parseFloat(sellThroughRate.toFixed(2)),
        trailing7DayVelocity: parseFloat(trailing7DayVelocity.toFixed(2)),
        daysOfCover: parseFloat(daysOfCover.toFixed(1)),
        replenishmentAlert,
        deadStockAlert,
        status
      });
    }
  }

  // 3. Compute Store Performance Metrics
  const storeMetricsList: StoreMetrics[] = [];

  for (const store of stores) {
    const storeRecords = storeGroups[store.id] || [];
    if (storeRecords.length === 0) continue;

    let revenue = 0;
    let unitsSold = 0;
    let totalOpeningStock = 0;
    let totalUnitsReceived = 0;

    // To compute average stock, group store records by date
    const dateStockSums: Record<string, number> = {};
    const storeSkuInitStock: Record<string, number> = {};

    for (const rec of storeRecords) {
      revenue += rec.unitsSold * rec.product.sellingPrice;
      unitsSold += rec.unitsSold;
      totalUnitsReceived += rec.unitsReceived;

      const dateStr = rec.date.toISOString().split('T')[0];
      dateStockSums[dateStr] = (dateStockSums[dateStr] || 0) + rec.openingStock;

      const skuKey = rec.sku;
      if (storeSkuInitStock[skuKey] === undefined) {
        storeSkuInitStock[skuKey] = rec.openingStock;
      }
    }

    // Sum initial stocks for all SKUs in this store
    totalOpeningStock = Object.values(storeSkuInitStock).reduce((a, b) => a + b, 0);

    const sellThroughRate = (unitsSold / (totalOpeningStock + totalUnitsReceived)) * 100;

    // Average stock over all days
    const dailyOpeningStocks = Object.values(dateStockSums);
    const averageStock = dailyOpeningStocks.reduce((a, b) => a + b, 0) / dailyOpeningStocks.length;

    // Inventory Turnover
    const inventoryTurnover = averageStock > 0 ? unitsSold / averageStock : 0;

    storeMetricsList.push({
      storeId: store.id,
      storeName: store.name,
      city: store.city,
      type: store.type,
      revenue,
      unitsSold,
      sellThroughRate: parseFloat(sellThroughRate.toFixed(2)),
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      performanceScore: 0, // calculated next
      rank: 0              // calculated next
    });
  }

  // Normalize metrics for Performance Score
  const maxRevenue = Math.max(...storeMetricsList.map(s => s.revenue), 1);
  const maxSTR = Math.max(...storeMetricsList.map(s => s.sellThroughRate), 1);
  const maxTurnover = Math.max(...storeMetricsList.map(s => s.inventoryTurnover), 1);

  for (const storeMetric of storeMetricsList) {
    const normRevenue = (storeMetric.revenue / maxRevenue) * 100;
    const normSTR = (storeMetric.sellThroughRate / maxSTR) * 100;
    const normTurnover = (storeMetric.inventoryTurnover / maxTurnover) * 100;

    // Score = 50% Revenue + 30% Sell-through + 20% Turnover
    const score = 0.5 * normRevenue + 0.3 * normSTR + 0.2 * normTurnover;
    storeMetric.performanceScore = parseFloat(score.toFixed(1));
  }

  // Sort and Rank Stores
  storeMetricsList.sort((a, b) => b.performanceScore - a.performanceScore);
  storeMetricsList.forEach((storeMetric, index) => {
    storeMetric.rank = index + 1;
  });

  // 4. Compute Dashboard Summary
  const totalRevenue = storeMetricsList.reduce((sum, s) => sum + s.revenue, 0);
  const totalUnitsSold = storeMetricsList.reduce((sum, s) => sum + s.unitsSold, 0);

  // Compute overall sell-through rate across all stores
  let globalOpeningStock = 0;
  let globalUnitsReceived = 0;

  for (const store of stores) {
    const storeRecords = storeGroups[store.id] || [];
    const storeSkuInitStock: Record<string, number> = {};

    for (const rec of storeRecords) {
      globalUnitsReceived += rec.unitsReceived;
      const skuKey = rec.sku;
      if (storeSkuInitStock[skuKey] === undefined) {
        storeSkuInitStock[skuKey] = rec.openingStock;
      }
    }
    globalOpeningStock += Object.values(storeSkuInitStock).reduce((a, b) => a + b, 0);
  }

  const averageSellThrough = (totalUnitsSold / (globalOpeningStock + globalUnitsReceived)) * 100;

  // Active Replenishment alerts count
  const activeAlertsCount = inventoryMetrics.filter(i => i.replenishmentAlert).length;

  const dashboardSummary: DashboardSummary = {
    totalRevenue,
    totalUnitsSold,
    averageSellThrough: parseFloat(averageSellThrough.toFixed(2)),
    activeAlertsCount
  };

  // Cache results
  cachedDashboardSummary = dashboardSummary;
  cachedStoreMetrics = storeMetricsList;
  cachedInventoryMetrics = inventoryMetrics;
  lastCalculatedTime = now;

  return {
    dashboard: dashboardSummary,
    stores: storeMetricsList,
    inventory: inventoryMetrics
  };
}
