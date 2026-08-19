import { NextResponse } from 'next/server';
import { calculateAllMetrics } from '@/lib/metrics';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // 1. Calculate main aggregates and lists
    const { dashboard, stores } = await calculateAllMetrics();

    // 2. Fetch sales logs to construct daily trend data
    const salesLogs = await prisma.dailyInventorySales.findMany({
      select: {
        date: true,
        unitsSold: true,
        storeId: true,
        product: {
          select: {
            category: true
          }
        }
      }
    });

    // 3. Aggregate trend data by date, store, and category
    // Using a map key like: date_storeId_category
    const trendMap: Record<string, { date: string; storeId: string; category: string; unitsSold: number }> = {};

    for (const log of salesLogs) {
      const dateStr = log.date.toISOString().split('T')[0];
      const storeId = log.storeId;
      const category = log.product.category;
      const key = `${dateStr}_${storeId}_${category}`;

      if (!trendMap[key]) {
        trendMap[key] = {
          date: dateStr,
          storeId,
          category,
          unitsSold: 0
        };
      }
      trendMap[key].unitsSold += log.unitsSold;
    }

    const trends = Object.values(trendMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json({
      dashboard,
      stores,
      trends
    });
  } catch (error: any) {
    console.error('Error fetching dashboard API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
