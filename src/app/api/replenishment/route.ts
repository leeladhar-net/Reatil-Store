import { NextRequest, NextResponse } from 'next/server';
import { calculateAllMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Threshold to trigger alert (defaults to 7 days cover)
    const alertThreshold = parseInt(searchParams.get('threshold') || '7', 10);
    // Target days of stock cover to restock to (defaults to 14 days cover)
    const targetDays = parseInt(searchParams.get('target') || '14', 10);

    const { inventory } = await calculateAllMetrics();

    // Filter items with days of cover below the alert threshold (and having a velocity > 0)
    // We should also include items with 0 stock and 0 velocity if they are bestsellers, 
    // or just generally if current stock is low.
    // Let's filter by replenishmentAlert based on the alertThreshold.
    const alertItems = inventory
      .map(item => {
        // Recalculate based on requested threshold
        const replenishmentAlert = item.daysOfCover < alertThreshold;
        
        // Suggested reorder: (targetDays * velocity) - currentStock
        // Ensure suggestion is at least 0 and rounded up
        let suggestedReorderQuantity = 0;
        if (replenishmentAlert) {
          suggestedReorderQuantity = Math.max(
            0,
            Math.ceil(targetDays * item.trailing7DayVelocity - item.currentStock)
          );
        }

        return {
          ...item,
          replenishmentAlert,
          suggestedReorderQuantity
        };
      })
      .filter(item => item.replenishmentAlert && item.status !== 'Dead Stock') // exclude dead stock from automatic reordering as per retail guidelines
      .sort((a, b) => a.daysOfCover - b.daysOfCover);

    return NextResponse.json({ alertItems });
  } catch (error: any) {
    console.error('Error fetching replenishment API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
