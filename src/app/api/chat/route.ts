import { NextResponse } from 'next/server';
import { calculateAllMetrics } from '@/lib/metrics';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    // 1. Fetch current aggregated metrics for context
    const { dashboard, stores, inventory } = await calculateAllMetrics();
    
    // Group categories
    const categoryTotals: Record<string, { revenue: number; unitsSold: number }> = {};
    for (const item of inventory) {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { revenue: 0, unitsSold: 0 };
      }
      categoryTotals[item.category].revenue += item.unitsSoldPeriod * item.sellingPrice;
      categoryTotals[item.category].unitsSold += item.unitsSoldPeriod;
    }

    const lowStockAlerts = inventory
      .filter(item => item.replenishmentAlert && item.status !== 'Dead Stock')
      .map(item => `${item.storeName} is low on ${item.productName} (SKU: ${item.sku}) - only ${item.currentStock} units left (${item.daysOfCover} days of cover, sales velocity: ${item.trailing7DayVelocity} units/day).`);

    const deadStock = inventory
      .filter(item => item.status === 'Dead Stock')
      .map(item => `${item.storeName} has dead stock of ${item.productName} (SKU: ${item.sku}) - ${item.currentStock} units unsold for over 30 days.`);

    const storeSummary = stores.map(s => `${s.rank}. ${s.storeName} (${s.city}) - Revenue: ₹${s.revenue.toLocaleString()}, Sell-through: ${s.sellThroughRate}%, Turnover: ${s.inventoryTurnover}, Score: ${s.performanceScore}`);

    const categorySummary = Object.entries(categoryTotals).map(([name, data]) => `- ${name}: ₹${data.revenue.toLocaleString()} revenue, ${data.unitsSold} units sold.`);

    const context = `
Current D2C Brand Retail State (Neeman's AI Intern Assistant Context):
1. Overall KPIs:
   - Total Revenue: ₹${dashboard.totalRevenue.toLocaleString()}
   - Total Units Sold: ${dashboard.totalUnitsSold.toLocaleString()}
   - Average Sell-Through Rate: ${dashboard.averageSellThrough}%
   - Active Replenishment Alerts: ${dashboard.activeAlertsCount}

2. Store Performance Leaderboard (Ranked):
   ${storeSummary.join('\n   ')}

3. Category Performance:
   ${categorySummary.join('\n   ')}

4. Critical Stockout Risks (Low Cover):
   ${lowStockAlerts.length > 0 ? lowStockAlerts.slice(0, 10).join('\n   ') : 'None'}

5. Stagnant / Dead Stock Items:
   ${deadStock.length > 0 ? deadStock.slice(0, 10).join('\n   ') : 'None'}
`;

    // 2. Query Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the AI Intern Assistant for Neeman's Retail Store Analytics. 
Answer the user's natural language question accurately and professionally, based on the structured context provided. 
Make your answers conversational, concise, and metrics-driven. Highlight specific numbers, store names, or SKUs from the context.
If the question is unrelated to the retail store analytics or Neeman's, politely redirect the user to ask about sales, inventory, stores, products, or replenishment.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        systemInstruction,
        `Context:\n${context}`,
        `User Question: ${question}`
      ]
    });

    const answer = response.text || '';
    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('Error in Q&A Chat API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
