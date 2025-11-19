import type { Exchange, RateDataPoint, MixerOrder } from "@shared/schema";
import { exchanges, rateHistory, mixerOrders, type SelectExchange, type InsertExchange, type InsertRateHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  getExchange(id: string): Promise<Exchange | undefined>;
  createExchange(exchange: Exchange, sessionId?: string, walletAddress?: string): Promise<Exchange>;
  updateExchangeStatus(id: string, status: string): Promise<void>;
  getAllExchanges(): Promise<Exchange[]>;
  getActiveExchangeBySession(sessionId: string): Promise<Exchange | undefined>;
  getExchangesByWallet(walletAddress: string): Promise<Exchange[]>;
  markExchangeCompleted(id: string): Promise<void>;
  markExchangeAutoClosed(id: string): Promise<void>;
  
  // Mixer order methods
  getMixerOrder(id: string): Promise<MixerOrder | undefined>;
  createMixerOrder(order: MixerOrder, sessionId?: string, walletAddress?: string): Promise<MixerOrder>;
  updateMixerOrderStatus(id: string, status: string, signature?: string): Promise<void>;
  getActiveMixerOrderBySession(sessionId: string): Promise<MixerOrder | undefined>;
  getMixerOrdersByWallet(walletAddress: string): Promise<MixerOrder[]>;
  markMixerOrderCompleted(id: string): Promise<void>;
  markMixerOrderAutoClosed(id: string): Promise<void>;
  
  // Rate history methods
  recordRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void>;
  getRateHistory(fromCurrency: string, toCurrency: string, hours: number): Promise<RateDataPoint[]>;
}

interface ExchangeMetadata {
  exchange: Exchange;
  sessionId?: string;
  walletAddress?: string;
  completedAt?: Date;
  autoClosedAt?: Date;
}

interface MixerOrderMetadata {
  order: MixerOrder;
  sessionId?: string;
  walletAddress?: string;
  completedAt?: Date;
  autoClosedAt?: Date;
}

export class MemStorage implements IStorage {
  private exchanges: Map<string, ExchangeMetadata>;
  private mixerOrders: Map<string, MixerOrderMetadata>;

  constructor() {
    this.exchanges = new Map();
    this.mixerOrders = new Map();
  }

  async getExchange(id: string): Promise<Exchange | undefined> {
    const metadata = this.exchanges.get(id);
    if (!metadata) return undefined;
    
    return {
      ...metadata.exchange,
      sessionId: metadata.sessionId,
      walletAddress: metadata.walletAddress,
      completedAt: metadata.completedAt?.toISOString(),
      autoClosedAt: metadata.autoClosedAt?.toISOString(),
    };
  }

  async createExchange(exchange: Exchange, sessionId?: string, walletAddress?: string): Promise<Exchange> {
    this.exchanges.set(exchange.id, {
      exchange,
      sessionId,
      walletAddress,
    });
    return exchange;
  }

  async updateExchangeStatus(id: string, status: string): Promise<void> {
    const metadata = this.exchanges.get(id);
    if (metadata) {
      metadata.exchange.status = status;
      this.exchanges.set(id, metadata);
    }
  }

  async getAllExchanges(): Promise<Exchange[]> {
    const now = Date.now();
    return Array.from(this.exchanges.values())
      .filter(m => {
        // Exclude expired unfunded orders (still in "waiting" status and past expiry time)
        if (m.exchange.status === 'waiting' && m.exchange.expiresAt && now > m.exchange.expiresAt) {
          return false;
        }
        return true;
      })
      .map(m => ({
        ...m.exchange,
        sessionId: m.sessionId,
        walletAddress: m.walletAddress,
        completedAt: m.completedAt?.toISOString(),
        autoClosedAt: m.autoClosedAt?.toISOString(),
      }));
  }

  async getActiveExchangeBySession(sessionId: string): Promise<Exchange | undefined> {
    const metadataList = Array.from(this.exchanges.values());
    for (const metadata of metadataList) {
      if (metadata.sessionId === sessionId && !metadata.autoClosedAt) {
        return {
          ...metadata.exchange,
          sessionId: metadata.sessionId,
          walletAddress: metadata.walletAddress,
          completedAt: metadata.completedAt?.toISOString(),
          autoClosedAt: undefined,
        };
      }
    }
    return undefined;
  }

  async getExchangesByWallet(walletAddress: string): Promise<Exchange[]> {
    const now = Date.now();
    return Array.from(this.exchanges.values())
      .filter(m => {
        // Must match wallet address
        if (m.walletAddress !== walletAddress) return false;
        
        // Exclude expired unfunded orders (still in "waiting" status and past expiry time)
        if (m.exchange.status === 'waiting' && m.exchange.expiresAt && now > m.exchange.expiresAt) {
          return false;
        }
        
        return true;
      })
      .map(m => ({
        ...m.exchange,
        sessionId: m.sessionId,
        walletAddress: m.walletAddress,
        completedAt: m.completedAt?.toISOString(),
        autoClosedAt: m.autoClosedAt?.toISOString(),
      }));
  }

  async markExchangeCompleted(id: string): Promise<void> {
    const metadata = this.exchanges.get(id);
    if (metadata) {
      metadata.completedAt = new Date();
      this.exchanges.set(id, metadata);
    }
  }

  async markExchangeAutoClosed(id: string): Promise<void> {
    const metadata = this.exchanges.get(id);
    if (metadata) {
      metadata.autoClosedAt = new Date();
      this.exchanges.set(id, metadata);
    }
  }

  // Mixer Order Methods
  async getMixerOrder(id: string): Promise<MixerOrder | undefined> {
    const metadata = this.mixerOrders.get(id);
    if (!metadata) return undefined;
    
    return {
      ...metadata.order,
      sessionId: metadata.sessionId,
      walletAddress: metadata.walletAddress,
      completedAt: metadata.completedAt?.toISOString(),
      autoClosedAt: metadata.autoClosedAt?.toISOString(),
    };
  }

  async createMixerOrder(order: MixerOrder, sessionId?: string, walletAddress?: string): Promise<MixerOrder> {
    this.mixerOrders.set(order.id, {
      order,
      sessionId,
      walletAddress,
    });
    return order;
  }

  async updateMixerOrderStatus(id: string, status: string, signature?: string): Promise<void> {
    const metadata = this.mixerOrders.get(id);
    if (metadata) {
      metadata.order.status = status;
      if (signature) {
        metadata.order.transactionSignature = signature;
      }
      this.mixerOrders.set(id, metadata);
    }
  }

  async getActiveMixerOrderBySession(sessionId: string): Promise<MixerOrder | undefined> {
    const metadataList = Array.from(this.mixerOrders.values());
    for (const metadata of metadataList) {
      if (metadata.sessionId === sessionId && !metadata.autoClosedAt) {
        return {
          ...metadata.order,
          sessionId: metadata.sessionId,
          walletAddress: metadata.walletAddress,
          completedAt: metadata.completedAt?.toISOString(),
          autoClosedAt: undefined,
        };
      }
    }
    return undefined;
  }

  async getMixerOrdersByWallet(walletAddress: string): Promise<MixerOrder[]> {
    const now = Date.now();
    return Array.from(this.mixerOrders.values())
      .filter(m => {
        if (m.walletAddress !== walletAddress) return false;
        if (m.order.status === 'pending' && m.order.expiresAt && now > m.order.expiresAt) {
          return false;
        }
        return true;
      })
      .map(m => ({
        ...m.order,
        sessionId: m.sessionId,
        walletAddress: m.walletAddress,
        completedAt: m.completedAt?.toISOString(),
        autoClosedAt: m.autoClosedAt?.toISOString(),
      }));
  }

  async markMixerOrderCompleted(id: string): Promise<void> {
    const metadata = this.mixerOrders.get(id);
    if (metadata) {
      metadata.completedAt = new Date();
      this.mixerOrders.set(id, metadata);
    }
  }

  async markMixerOrderAutoClosed(id: string): Promise<void> {
    const metadata = this.mixerOrders.get(id);
    if (metadata) {
      metadata.autoClosedAt = new Date();
      this.mixerOrders.set(id, metadata);
    }
  }

  async recordRate(fromCurrency: string, toCurrency: string, rate: number): Promise<void> {
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
      provider: row.provider,
      payinAddress: row.payinAddress,
      payoutAddress: row.payoutAddress,
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      fromAmount: row.fromAmount,
      toAmount: row.toAmount,
      status: row.status,
      validUntil: row.validUntil || undefined,
      expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
      sessionId: row.sessionId || undefined,
      walletAddress: row.walletAddress || undefined,
      completedAt: row.completedAt?.toISOString(),
      autoClosedAt: row.autoClosedAt?.toISOString(),
    };
  }

  async createExchange(exchange: Exchange, sessionId?: string, walletAddress?: string): Promise<Exchange> {
    await db.insert(exchanges).values({
      exchangeId: exchange.id,
      provider: exchange.provider || "ChangeNOW",
      payinAddress: exchange.payinAddress,
      payoutAddress: exchange.payoutAddress,
      fromCurrency: exchange.fromCurrency,
      toCurrency: exchange.toCurrency,
      fromAmount: exchange.fromAmount,
      toAmount: exchange.toAmount,
      status: exchange.status,
      validUntil: exchange.validUntil,
      expiresAt: exchange.expiresAt?.toString(),
      sessionId,
      walletAddress,
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
    const now = Date.now();
    
    return result
      .filter((row) => {
        // Exclude expired unfunded orders (still in "waiting" status and past expiry time)
        if (row.status === 'waiting' && row.expiresAt && now > parseInt(row.expiresAt)) {
          return false;
        }
        return true;
      })
      .map((row) => ({
        id: row.exchangeId,
        provider: row.provider,
        payinAddress: row.payinAddress,
        payoutAddress: row.payoutAddress,
        fromCurrency: row.fromCurrency,
        toCurrency: row.toCurrency,
        fromAmount: row.fromAmount,
        toAmount: row.toAmount,
        status: row.status,
        validUntil: row.validUntil || undefined,
        expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
        sessionId: row.sessionId || undefined,
        walletAddress: row.walletAddress || undefined,
        completedAt: row.completedAt?.toISOString(),
        autoClosedAt: row.autoClosedAt?.toISOString(),
      }));
  }

  async getActiveExchangeBySession(sessionId: string): Promise<Exchange | undefined> {
    const result = await db
      .select()
      .from(exchanges)
      .where(
        and(
          eq(exchanges.sessionId, sessionId),
          sql`${exchanges.autoClosedAt} IS NULL`
        )
      )
      .orderBy(desc(exchanges.createdAt))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      id: row.exchangeId,
      provider: row.provider,
      payinAddress: row.payinAddress,
      payoutAddress: row.payoutAddress,
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      fromAmount: row.fromAmount,
      toAmount: row.toAmount,
      status: row.status,
      validUntil: row.validUntil || undefined,
      expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
      sessionId: row.sessionId || undefined,
      walletAddress: row.walletAddress || undefined,
      completedAt: row.completedAt?.toISOString(),
      autoClosedAt: row.autoClosedAt?.toISOString(),
    };
  }

  async getExchangesByWallet(walletAddress: string): Promise<Exchange[]> {
    const result = await db
      .select()
      .from(exchanges)
      .where(eq(exchanges.walletAddress, walletAddress))
      .orderBy(desc(exchanges.createdAt));
    
    const now = Date.now();
    
    return result
      .filter((row) => {
        // Exclude expired unfunded orders (still in "waiting" status and past expiry time)
        if (row.status === 'waiting' && row.expiresAt && now > parseInt(row.expiresAt)) {
          return false;
        }
        return true;
      })
      .map((row) => ({
        id: row.exchangeId,
        provider: row.provider,
        payinAddress: row.payinAddress,
        payoutAddress: row.payoutAddress,
        fromCurrency: row.fromCurrency,
        toCurrency: row.toCurrency,
        fromAmount: row.fromAmount,
        toAmount: row.toAmount,
        status: row.status,
        validUntil: row.validUntil || undefined,
        expiresAt: row.expiresAt ? parseInt(row.expiresAt) : undefined,
        sessionId: row.sessionId || undefined,
        walletAddress: row.walletAddress || undefined,
        completedAt: row.completedAt?.toISOString(),
        autoClosedAt: row.autoClosedAt?.toISOString(),
      }));
  }

  async markExchangeCompleted(id: string): Promise<void> {
    await db
      .update(exchanges)
      .set({ completedAt: sql`NOW()` })
      .where(eq(exchanges.exchangeId, id));
  }

  async markExchangeAutoClosed(id: string): Promise<void> {
    await db
      .update(exchanges)
      .set({ autoClosedAt: sql`NOW()` })
      .where(eq(exchanges.exchangeId, id));
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
