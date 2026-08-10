import { doc, runTransaction, serverTimestamp, Timestamp, collection } from "firebase/firestore";
import { db } from "../shared/firebase";
import type { ActiveStock, StockHistory, User } from "./model";
import { fetchBatchQuotes } from "../shared/marketApi";


export async function addStock(userId: string, symbol: string, localizedName?: string) {
  // 1. Fetch fresh price outside transaction
  const quote = (await fetchBatchQuotes([symbol], true))[0];
  if (!quote || quote.price <= 0) throw new Error("INVALID_QUOTE");

  const activeStockId = `${userId}__${symbol}`;
  const userRef = doc(db, "users", userId);
  const activeStockRef = doc(db, "activeStocks", activeStockId);

  // 2. Transaction
  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("USER_NOT_FOUND");
    
    const userData = userDoc.data() as User;
    if (userData.activeStockIds.length >= 5) throw new Error("ACTIVE_STOCK_LIMIT");
    
    const activeDoc = await transaction.get(activeStockRef);
    if (activeDoc.exists()) throw new Error("DUPLICATE_STOCK");

    const newActiveStock: ActiveStock = {
      userId,
      symbol: quote.symbol,
      name: localizedName && /[가-힣]/.test(localizedName) ? localizedName : quote.name,
      currency: quote.currency,
      buyPrice: quote.price,
      buyPriceAsOf: Timestamp.fromDate(new Date(quote.asOf)),
      addedAt: serverTimestamp() as Timestamp
    };

    transaction.set(activeStockRef, newActiveStock);
    transaction.set(userRef, {
      ...userData,
      activeStockIds: [...userData.activeStockIds, activeStockId]
    });
  });
}

export async function closeStock(userId: string, symbol: string) {
  const activeStockId = `${userId}__${symbol}`;
  const quote = (await fetchBatchQuotes([symbol], true))[0];
  if (!quote || quote.price <= 0) throw new Error("INVALID_QUOTE");

  const historyRef = doc(collection(db, "stockHistory"));
  const userRef = doc(db, "users", userId);
  const activeStockRef = doc(db, "activeStocks", activeStockId);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const activeDoc = await transaction.get(activeStockRef);

    if (!userDoc.exists() || !activeDoc.exists()) {
      throw new Error("NOT_FOUND");
    }

    const userData = userDoc.data() as User;
    const activeData = activeDoc.data() as ActiveStock;

    if (activeData.userId !== userId) throw new Error("UNAUTHORIZED");

    const historyData: StockHistory = {
      ...activeData,
      sourceActiveStockId: activeStockId,
      sellPrice: quote.price,
      sellPriceAsOf: Timestamp.fromDate(new Date(quote.asOf)),
      closedAt: serverTimestamp() as Timestamp
    };

    transaction.set(historyRef, historyData);
    transaction.delete(activeStockRef);
    transaction.set(userRef, {
      ...userData,
      activeStockIds: userData.activeStockIds.filter(id => id !== activeStockId)
    });
  });
}
