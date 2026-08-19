import { NextResponse } from 'next/server';
import { calculateAllMetrics } from '@/lib/metrics';

export async function GET() {
  try {
    const { inventory } = await calculateAllMetrics();
    return NextResponse.json({ inventory });
  } catch (error: any) {
    console.error('Error fetching inventory health API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
