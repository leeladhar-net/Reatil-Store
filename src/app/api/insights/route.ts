import { NextResponse } from 'next/server';
import { calculateAllMetrics } from '@/lib/metrics';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'dev_insights_cache.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRegenerate = searchParams.get('force') === 'true';

    // 1. Check if cached insights exist and are valid (less than 12 hours old)
    if (!forceRegenerate && fs.existsSync(CACHE_FILE_PATH)) {
      try {
        const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
        const fileStats = fs.statSync(CACHE_FILE_PATH);
        const ageInMs = Date.now() - fileStats.mtime.getTime();
        const twelveHoursInMs = 12 * 60 * 60 * 1000;

        if (ageInMs < twelveHoursInMs && Array.isArray(cacheData)) {
          console.log('Serving insights from local cache...');
          return NextResponse.json({ insights: cacheData, cached: true });
        }
      } catch (cacheError) {
        console.error('Failed to read insights cache, regenerating...', cacheError);
      }
    }

    // 2. Compute the current aggregated metrics to feed into the prompt
    const { dashboard, stores, inventory } = await calculateAllMetrics();

    // Summarize low stock items (Top 5 lowest days of cover)
    const lowStockAlerts = inventory
      .filter(item => item.replenishmentAlert && item.status !== 'Dead Stock')
      .map(item => ({
        store: item.storeName,
        sku: item.sku,
        product: item.productName,
        currentStock: item.currentStock,
        daysOfCover: item.daysOfCover,
        weeklyVelocity: item.trailing7DayVelocity * 7
      }))
      .slice(0, 5);

    // Summarize dead stock (Top 5 highest stock with 0 sales)
    const deadStock = inventory
      .filter(item => item.status === 'Dead Stock')
      .map(item => ({
        store: item.storeName,
        sku: item.sku,
        product: item.productName,
        currentStock: item.currentStock,
        costValue: item.currentStock * item.costPrice
      }))
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 5);

    // Summarize store performance
    const storeSummary = stores.map(s => ({
      name: s.storeName,
      city: s.city,
      revenue: s.revenue,
      sellThrough: s.sellThroughRate,
      turnover: s.inventoryTurnover,
      score: s.performanceScore,
      rank: s.rank
    }));

    // Summarize category sales
    const categoryTotals: Record<string, { revenue: number; unitsSold: number }> = {};
    for (const item of inventory) {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { revenue: 0, unitsSold: 0 };
      }
      categoryTotals[item.category].revenue += item.unitsSoldPeriod * item.sellingPrice;
      categoryTotals[item.category].unitsSold += item.unitsSoldPeriod;
    }
    const categorySummary = Object.entries(categoryTotals).map(([name, data]) => ({
      category: name,
      revenue: data.revenue,
      unitsSold: data.unitsSold
    }));

    const businessState = {
      dashboard,
      storePerformance: storeSummary,
      categoryPerformance: categorySummary,
      criticalReplenishments: lowStockAlerts,
      deadStockAnomalies: deadStock
    };

    // 3. Initialize Gemini client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert Retail Data Analyst and AI Intern for Neeman's, a leading D2C lifestyle and footwear brand. 
Analyze the following aggregated store sales and inventory metrics to generate 3 to 5 high-impact, actionable business insights/recommendations.

Aggregated Business State:
${JSON.stringify(businessState, null, 2)}

Provide your response strictly as a JSON array of objects. Do not include any explanation or markdown formatting outside the JSON array. Each object in the array must follow this schema:
{
  "type": "warning" | "info" | "success",
  "title": "Short, Punchy Header (max 6 words)",
  "description": "A detailed, professional insight that names specific stores, SKUs, or categories and suggests concrete operational actions (e.g., markdown promotions, inventory transfers, restocking schedules)."
}

Guidelines:
- "warning" type should be used for urgent stockout risks (low days of cover on bestsellers).
- "info" type should be used for dead stock opportunities (discounting or store transfers).
- "success" type should be used for recognizing overperforming stores or categories and capitalizing on their momentum.
- Avoid generic recommendations. reference actual data values (revenue, days of cover, product names, etc.) from the provided JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    const responseText = response.text || '';

    // Parse LLM response and cache it
    let insights = JSON.parse(responseText.trim());

    if (!Array.isArray(insights)) {
      if (insights.insights && Array.isArray(insights.insights)) {
        insights = insights.insights;
      } else {
        throw new Error('LLM did not return a valid JSON array.');
      }
    }

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(insights, null, 2), 'utf-8');

    return NextResponse.json({ insights, cached: false });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
