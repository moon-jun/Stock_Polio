import type { Timestamp } from "firebase/firestore";

export type Currency = string;

export type User = { 
  name: string; 
  activeStockIds: string[]; 
  createdAt: Timestamp; 
};

export type ActiveStock = {
  userId: string;
  symbol: string;
  name: string;
  currency: Currency;
  buyPrice: number;
  buyPriceAsOf: Timestamp;
  addedAt: Timestamp;
};

export type StockHistory = ActiveStock & {
  sourceActiveStockId: string;
  sellPrice: number;
  sellPriceAsOf: Timestamp;
  closedAt: Timestamp;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: Currency;
  asOf: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "UNKNOWN";
};
