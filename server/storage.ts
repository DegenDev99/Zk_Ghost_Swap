import type { Exchange } from "@shared/schema";

export interface IStorage {
  getExchange(id: string): Promise<Exchange | undefined>;
  createExchange(exchange: Exchange): Promise<Exchange>;
  updateExchangeStatus(id: string, status: string): Promise<void>;
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
}

export const storage = new MemStorage();
