# Retail Store Analytics — Neeman's AI Intern Assignment

An AI-powered, production-ready internal web application for Neeman's to track inventory movement, calculate critical retail metrics, monitor restocking alerts, and query data using plain English.

---

## 1. Problem Statement

Modern Direct-to-Consumer (D2C) brands like Neeman's deal with complex supply chain and inventory flows across multiple retail formats (flagships, mall stores, outlets). Store managers and supply chain coordinators need to make fast, daily decisions regarding:
- Restocking fast-moving bestsellers to prevent stockouts (which represent lost revenue).
- Identifying stagnant/dead stock to run targeted discounts or transfer units to high-performing locations.
- Ranking store operational efficiency.

Relying on manual spreadsheet audits is slow and error-prone. This application solves this by consolidating store sales and inventory logs, calculating deterministic retail metrics, and layer-integrating a Large Language Model (LLM) to deliver plain-English recommendations and a Q&A agent.

---

## 2. Solution Overview

The Retail Store Analytics dashboard provides a unified dashboard featuring:
1. **KPI Dashboard**: A high-level overview of total revenue, units sold, average sell-through %, and alerts.
2. **Interactive Chart**: Recharts area chart showing daily units sold over 75 days, filterable by store and category.
3. **Store Leaderboard**: Ranked store list based on a composite performance score.
4. **Inventory Health Tab**: Filterable grid displaying every SKU × Store status (Healthy, Low Stock, Overstock, Dead Stock) and days of cover.
5. **Replenishment alerts page**: restock recommendations with sliding controls that recalculate suggested reorder quantities in real-time.
6. **AI Insights & Q&A Chat**: Contextual insights and conversational Q&A powered by the Gemini 1.5 Flash model.

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                        Frontend                        │
│          Next.js App Router (React Components)         │
├────────────────────┬─────────────────┬─────────────────┤
│     Dashboard      │    Inventory    │  Replenishment  │
│    (Recharts)      │     Health      │     Alerts      │
└─────────┬──────────┴────────┬────────┴────────┬────────┘
          │                   │                 │
          ▼                   ▼                 ▼
┌────────────────────────────────────────────────────────┐
│                      API Routes                        │
│   /api/dashboard  /api/inventory  /api/replenishment   │
│            /api/insights       /api/chat               │
└─────────┬───────────────────┬─────────────────┬────────┘
          │                   │                 │
          ▼                   │                 ▼
┌──────────────────┐          │       ┌──────────────────┐
│   Prisma ORM     │          │       │    Gemini API    │
│  (SQLite DB)     │          │       │(gemini-1.5-flash)│
└─────────┬────────┘          │       └─────────▲────────┘
          │                   │                 │
          ▼                   ▼                 │
┌────────────────────────────────────────┐      │
│          Metrics Engine (lib/metrics)   │      │
│   Calculates STR, Turnover, Days Cover ├──────┘
│   (Aggregates and formats LLM context)  │
└────────────────────────────────────────┘
```

---

## 4. AI Integration & Cache Policy

- **Model Used**: `gemini-1.5-flash` via the `@google/generative-ai` SDK.
- **Data Privacy & Cost Reduction**: Instead of sending raw, granular transaction logs (thousands of rows) to the LLM, the **Metrics Engine** calculates aggregates (KPIs, top/bottom performing stores, low cover alerts, stagnant SKUs) first. This summarized metadata is sent inside the prompt.
- **Cache Strategy**: AI Insights are generated and stored in a local cache file (`dev_insights_cache.json`). The application retrieves insights from the cache on page load. Users can trigger a fresh analysis by clicking the **Regenerate** button, preventing unnecessary API expenses.

---

## 5. Local Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24.14.1 used during development).
- **npm**: v9.0.0 or higher.

### Installation Steps

1. **Clone/Move into project folder**:
   ```bash
   cd retail-store-analytics
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project (if not present) and add your Gemini API Key:
   ```env
   DATABASE_URL="file:./dev.db"
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Initialize Database and Run Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed the Database**:
   Populates 75 days of transaction history (11,250 records) for 6 stores and 25 products:
   ```bash
   node prisma/seed.js
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 6. Assumptions Made

1. **Transaction Timeline**: Sales and inventory values are seeded for a fixed 75-day timeline (from June 5, 2026 to August 18, 2026). The "Current Stock" is defined as the closing stock of the most recent date in the database.
2. **Sell-Through Rate Formula**: Calculated over the entire 75-day period as `(units_sold / (initial_opening_stock + units_received)) * 100`.
3. **Inventory Turnover**: Calculated as `total_units_sold / average_stock` over the timeline, where `average_stock` represents the average of daily opening stocks for all SKUs combined.
4. **Days of Stock Cover**: Calculated as `current_stock / trailing_7_day_sales_velocity`. If a SKU has zero sales over the trailing 7 days, its cover is set to `999` days (or `0` if current stock is also `0`).
5. **Dead Stock Warning**: Triggered if a SKU has stock on hand but has generated `0` sales in the trailing 30 days.
6. **Store Performance Score Weights**: Weighted composite index of Revenue (50%), Sell-Through % (30%), and Turnover (20%), normalized out of 100 relative to the highest-performing store.
