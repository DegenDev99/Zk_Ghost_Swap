import type { Exchange } from "@shared/schema";
import { exchanges, type SelectExchange, type InsertExchange } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getExchange(id: string): Promise<Exchange | undefined>;
  createExchange(exchange: Exchange): Promise<Exchange>;
  updateExchangeStatus(id: string, status: string): Promise<void>;
  getAllExchanges(): Promise<Exchange[]>;
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
}

export const storage = new DbStorage();
