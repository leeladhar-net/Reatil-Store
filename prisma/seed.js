const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed process...');

  // 1. Clear database
  console.log('Clearing existing data...');
  await prisma.dailyInventorySales.deleteMany();
  await prisma.store.deleteMany();
  await prisma.product.deleteMany();

  // 2. Insert stores
  console.log('Seeding stores...');
  const stores = [
    { id: 'ST001', name: 'Bangalore Flagship', city: 'Bangalore', type: 'flagship' }, // Overperforming
    { id: 'ST002', name: 'Mumbai Mall Store', city: 'Mumbai', type: 'mall' },
    { id: 'ST003', name: 'Delhi Connaught Place', city: 'Delhi', type: 'mall' },
    { id: 'ST004', name: 'Chennai OMR Outlet', city: 'Chennai', type: 'outlet' },   // Underperforming
    { id: 'ST005', name: 'Hyderabad Gachibowli', city: 'Hyderabad', type: 'mall' },
    { id: 'ST006', name: 'Pune FC Road', city: 'Pune', type: 'flagship' }
  ];

  for (const store of stores) {
    await prisma.store.create({ data: store });
  }

  // 3. Insert products (25 SKUs across 5 categories)
  console.log('Seeding products...');
  const products = [
    // Sneakers
    { sku: 'SKU001', name: 'Classic Knit Sneaker', category: 'Sneakers', costPrice: 1500, sellingPrice: 2999 }, // Bestseller
    { sku: 'SKU002', name: 'Active Cloud Runner', category: 'Sneakers', costPrice: 2000, sellingPrice: 3999 },
    { sku: 'SKU003', name: 'Retro Leather Court', category: 'Sneakers', costPrice: 1800, sellingPrice: 3499 },
    { sku: 'SKU004', name: 'Everyday Canvas Sneaker', category: 'Sneakers', costPrice: 1000, sellingPrice: 1999 },
    { sku: 'SKU005', name: 'Trail Blazer Runner', category: 'Sneakers', costPrice: 2200, sellingPrice: 4499 },
    // Loafers
    { sku: 'SKU006', name: 'Premium Suede Loafer', category: 'Loafers', costPrice: 2500, sellingPrice: 4999 },  // Dead stock in ST004
    { sku: 'SKU007', name: 'Casual Slip-on Loafer', category: 'Loafers', costPrice: 1500, sellingPrice: 2999 },
    { sku: 'SKU008', name: 'Classic Leather Penny Loafer', category: 'Loafers', costPrice: 2800, sellingPrice: 5499 },
    { sku: 'SKU009', name: 'Tassel Dress Moccasin', category: 'Loafers', costPrice: 2600, sellingPrice: 5199 },
    { sku: 'SKU010', name: 'Summer Linen Loafer', category: 'Loafers', costPrice: 1200, sellingPrice: 2499 },
    // Sandals
    { sku: 'SKU011', name: 'Comfort Leather Sandal', category: 'Sandals', costPrice: 800, sellingPrice: 1599 },
    { sku: 'SKU012', name: 'Active Outdoor Sandal', category: 'Sandals', costPrice: 1100, sellingPrice: 2199 },
    { sku: 'SKU013', name: 'Cork-bed Slide Sandal', category: 'Sandals', costPrice: 900, sellingPrice: 1799 },
    { sku: 'SKU014', name: 'Minimalist Flat Sandal', category: 'Sandals', costPrice: 600, sellingPrice: 1199 },
    { sku: 'SKU015', name: 'Premium Leather Slide', category: 'Sandals', costPrice: 1300, sellingPrice: 2599 },
    // Boots
    { sku: 'SKU016', name: 'Classic Chelsea Boot', category: 'Boots', costPrice: 3000, sellingPrice: 5999 }, // Bestseller in winter/north
    { sku: 'SKU017', name: 'Rugged Lace-up Boot', category: 'Boots', costPrice: 3200, sellingPrice: 6499 },
    { sku: 'SKU018', name: 'Desert Chukka Boot', category: 'Boots', costPrice: 2200, sellingPrice: 4399 },
    { sku: 'SKU019', name: 'Waterproof Hiking Boot', category: 'Boots', costPrice: 3500, sellingPrice: 6999 },
    { sku: 'SKU020', name: 'Elegant Suede Dress Boot', category: 'Boots', costPrice: 3100, sellingPrice: 6199 },
    // Slip-ons
    { sku: 'SKU021', name: 'Breathable Mesh Slip-on', category: 'Slip-ons', costPrice: 900, sellingPrice: 1899 },
    { sku: 'SKU022', name: 'Lightweight Go-walk', category: 'Slip-ons', costPrice: 1200, sellingPrice: 2399 },
    { sku: 'SKU023', name: 'Knitted Comfort Slip-on', category: 'Slip-ons', costPrice: 1100, sellingPrice: 2199 },
    { sku: 'SKU024', name: 'Classic House Slipper', category: 'Slip-ons', costPrice: 500, sellingPrice: 999 }, // Dead stock overall
    { sku: 'SKU025', name: 'Orthopedic Comfort Slip-on', category: 'Slip-ons', costPrice: 1400, sellingPrice: 2799 }
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  // 4. Generate Daily Inventory & Sales Data (75 Days)
  console.log('Generating 75 days of transaction history...');
  
  // Set timeframe: June 5, 2026 to August 18, 2026 (75 days)
  const totalDays = 75;
  const startDate = new Date('2026-06-05T00:00:00.000Z');
  
  // Keep track of current stock for each store-SKU combination
  const stockTracker = {};
  
  // Initialize stock tracker
  for (const store of stores) {
    stockTracker[store.id] = {};
    for (const prod of products) {
      let initialStock = 30; // default initial stock
      
      // Customize initial stocks for specific patterns
      if (prod.sku === 'SKU001') {
        initialStock = store.id === 'ST001' ? 80 : 35; // Bestseller gets more starting stock in high-performing store
      } else if (prod.sku === 'SKU006' && store.id === 'ST004') {
        initialStock = 45; // Premium Loafer dead stock in Chennai
      } else if (prod.sku === 'SKU024') {
        initialStock = store.id === 'ST004' ? 50 : 25; // House Slipper dead stock
      } else if (store.id === 'ST004') {
        initialStock = 20; // Underperforming store starts with less stock
      } else if (store.id === 'ST001') {
        initialStock = 60; // Overperforming store starts with more stock
      }
      
      stockTracker[store.id][prod.sku] = initialStock;
    }
  }

  const transactionBatch = [];

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + dayOffset);

    for (const store of stores) {
      for (const prod of products) {
        const currentStock = stockTracker[store.id][prod.sku];
        let unitsReceived = 0;
        let unitsSold = 0;

        // --- Replenishment Logic ---
        // Normal replenishment happens when stock is low
        const isBestsellerInBangalore = prod.sku === 'SKU001' && store.id === 'ST001';
        const isDeadStockInChennai = prod.sku === 'SKU006' && store.id === 'ST004';
        const isDeadStockSlipper = prod.sku === 'SKU024';

        // Anomaly: Intentionally delay replenishment for SKU001 in ST001 during days 20-30 and 50-60 to trigger stockouts
        const isStockoutPeriod = (dayOffset >= 20 && dayOffset <= 28) || (dayOffset >= 50 && dayOffset <= 58);

        if (isDeadStockInChennai || (isDeadStockSlipper && store.id === 'ST004')) {
          // Dead stock in Chennai receives absolutely no stock
          unitsReceived = 0;
        } else if (isBestsellerInBangalore) {
          // Bestseller in overperforming store: needs frequent, large replenishments
          if (currentStock < 15 && !isStockoutPeriod) {
            // Replenish 60 units
            unitsReceived = 60;
          }
        } else {
          // General products replenishment
          if (currentStock < 8) {
            // 40% chance of receiving 30 units on any given day it is below threshold
            if (Math.random() < 0.4) {
              unitsReceived = 30;
            }
          }
        }

        // --- Sales Velocity Logic ---
        if (isDeadStockInChennai || (isDeadStockSlipper && store.id === 'ST004')) {
          // Dead stock: absolutely 0 sales
          unitsSold = 0;
        } else {
          // Base daily sales velocity
          let baseVelocity = 1.2; // default normal speed

          if (prod.sku === 'SKU001') {
            baseVelocity = store.id === 'ST001' ? 7.5 : 2.5; // Bestseller velocity
          } else if (prod.sku === 'SKU016') {
            baseVelocity = store.id === 'ST003' ? 3.0 : 1.8; // Boots sell better in cold Delhi
          }

          // Adjust velocity by store type/performance
          if (store.id === 'ST001') {
            baseVelocity *= 1.8; // Bangalore Flagship multiplies sales
          } else if (store.id === 'ST004') {
            baseVelocity *= 0.25; // Chennai Outlet underperforms heavily (75% sales reduction)
          }

          // Randomize daily sales around base velocity
          const randomFactor = Math.random() * 1.5; // scale factor
          let calculatedDemand = Math.floor(baseVelocity * randomFactor);

          // Ensure it's at least 0
          calculatedDemand = Math.max(0, calculatedDemand);

          // Cap demand by available stock
          const totalAvailable = currentStock + unitsReceived;
          unitsSold = Math.min(calculatedDemand, totalAvailable);
        }

        const closingStock = currentStock + unitsReceived - unitsSold;

        // Update current stock tracker for next day
        stockTracker[store.id][prod.sku] = closingStock;

        // Push to database payload
        transactionBatch.push({
          date: currentDate,
          storeId: store.id,
          sku: prod.sku,
          openingStock: currentStock,
          unitsReceived,
          unitsSold,
          closingStock
        });
      }
    }
  }

  console.log(`Prepared ${transactionBatch.length} transaction records. Inserting into SQLite database...`);

  // Bulk insert in chunks of 1000 to keep SQLite memory usage optimized
  const chunkSize = 1000;
  for (let i = 0; i < transactionBatch.length; i += chunkSize) {
    const chunk = transactionBatch.slice(i, i + chunkSize);
    await prisma.dailyInventorySales.createMany({
      data: chunk
    });
    console.log(`Inserted records ${i} to ${Math.min(i + chunkSize, transactionBatch.length)}`);
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
