-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "sku" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "costPrice" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "DailyInventorySales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "storeId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "openingStock" INTEGER NOT NULL,
    "unitsReceived" INTEGER NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "closingStock" INTEGER NOT NULL,
    CONSTRAINT "DailyInventorySales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyInventorySales_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Product" ("sku") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyInventorySales_date_storeId_sku_key" ON "DailyInventorySales"("date", "storeId", "sku");
