import type { Exchange, RateDataPoint } from "@shared/schema";
import { exchanges, rateHistory, type SelectExchange, type InsertExchange, type InsertRateHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  getExchange(id: string): Promise<Exchange | undefined>;
  createExchange(exchange: Exchange): Promise<Exchange>;
  updateExchangeStatus(id: string, status: string): Promise<void>;
  getAllExchanges(): Promise<Exchange[]>;
  
  // Rate history methods
  recordRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void>;
  getRateHistory(fromCurrency: string, toCurrency: string, hours: number): Promise<RateDataPoint[]>;
}

export class MemStorage implements IStorage {
  private exchanges: Map<string, Exchange>;

  constructor() {
    this.exchanges = new Map();
  }

  async getExchange(id: string): Promise<Exchange | undefined> {
    return this.exchanges.get(id);
  }

  async createExchange(exchange: Exchange): Promise<Exchange> {
    this.exchanges.set(exchange.id, exchange);
    return exchange;
  }

  async updateExchangeStatus(id: string, status: string): Promise<void> {
    const exchange = this.exchanges.get(id);
    if (exchange) {
      exchange.status = status;
      this.exchanges.set(id, exchange);
    }
  }

  async getAllExchanges(): Promise<Exchange[]> {
    return Array.from(this.exchanges.values());
  }

  async recordRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    // In-memory storage doesn't persist rate history
  }

  async getRateHistory(fromCurrency: string, toCurrency: string, hours: number): Promise<RateDataPoint[]> {
    return [];
  }
}

export class DbStorage implements IStorage {
  async getExchange(id: string): Promise<Exchange | undefined> {
    const result = await db.select().from(exchanges).where(eq(exchanges.exchangeId, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      id: row.exchangeId,
      payinAddress: row.payinAddress,
      payoutAddress: row.payoutAddress,
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      fromAmount: row.fromAmount,
      toAmount: row.toAmount,
      status: row.status,
      validUntil: row.validUntil || undefined,
      expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
    };
  }

  async createExchange(exchange: Exchange): Promise<Exchange> {
    await db.insert(exchanges).values({
      exchangeId: exchange.id,
      payinAddress: exchange.payinAddress,
      payoutAddress: exchange.payoutAddress,
      fromCurrency: exchange.fromCurrency,
      toCurrency: exchange.toCurrency,
      fromAmount: exchange.fromAmount,
      toAmount: exchange.toAmount,
      status: exchange.status,
      validUntil: exchange.validUntil,
      expiresAt: exchange.expiresAt?.toString(),
    });
    return exchange;
  }

  async updateExchangeStatus(id: string, status: string): Promise<void> {
    await db.update(exchanges)
      .set({ status })
      .where(eq(exchanges.exchangeId, id));
  }

  async getAllExchanges(): Promise<Exchange[]> {
    const result = await db.select().from(exchanges).orderBy(desc(exchanges.createdAt));
    
    return result.map((row) => ({
      id: row.exchangeId,
      payinAddress: row.payinAddress,
      payoutAddress: row.payoutAddress,
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      fromAmount: row.fromAmount,
      toAmount: row.toAmount,
      status: row.status,
      validUntil: row.validUntil || undefined,
      expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
    }));
  }

  async recordRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
    await db.insert(rateHistory).values({
      fromCurrency,
      toCurrency,
      rate: rate.toString(),
    });
  }

  async getRateHistory(fromCurrency: string, toCurrency: string, hours: number): Promise<RateDataPoint[]> {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    const result = await db
      .select()
      .from(rateHistory)
      .where(
        and(
          eq(rateHistory.fromCurrency, fromCurrency),
          eq(rateHistory.toCurrency, toCurrency),
          gte(rateHistory.recordedAt, hoursAgo)
        )
      )
      .orderBy(rateHistory.recordedAt);
    
    return result.map((row) => ({
      timestamp: row.recordedAt.getTime(),
      rate: parseFloat(row.rate),
    }));
  }
}

export const storage = new DbStorage();
