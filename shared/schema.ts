import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Currency interface from ChangeNOW API
export interface Currency {
  ticker: string;
  name: string;
  image?: string;
  network?: string;
  legacyTicker?: string;
}

// Exchange Amount estimation from ChangeNOW API
export interface ExchangeAmount {
  estimatedAmount: string;
  transactionSpeedForecast?: string;
  warningMessage?: string;
}

// Exchange transaction
export interface Exchange {
  id: string;
  provider?: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  validUntil?: string;
  expiresAt?: number; // Server-provided expiry timestamp
  sessionId?: string;
  walletAddress?: string;
  completedAt?: string; // ISO timestamp when order finished
  autoClosedAt?: string; // ISO timestamp when order auto-closed
}

// Validation schemas
export const createExchangeSchema = z.object({
  from: z.string().min(1, "From currency is required"),
  to: z.string().min(1, "To currency is required"),
  fromNetwork: z.string().optional(),
  toNetwork: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  address: z.string().min(10, "Invalid payout address"),
});

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;

// Exchange status response
export interface ExchangeStatusResponse {
  status: string;
  payinHash?: string;
  payoutHash?: string;
  amountFrom?: string;
  amountTo?: string;
}

// Database table for persisting exchanges
export const exchanges = pgTable("exchanges", {
  id: serial("id").primaryKey(),
  exchangeId: varchar("exchange_id", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }).notNull().default("ChangeNOW"),
  payinAddress: varchar("payin_address", { length: 255 }).notNull(),
  payoutAddress: varchar("payout_address", { length: 255 }).notNull(),
  fromCurrency: varchar("from_currency", { length: 50 }).notNull(),
  toCurrency: varchar("to_currency", { length: 50 }).notNull(),
  fromAmount: varchar("from_amount", { length: 100 }).notNull(),
  toAmount: varchar("to_amount", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  validUntil: varchar("valid_until", { length: 100 }),
  expiresAt: varchar("expires_at", { length: 100 }),
  sessionId: varchar("session_id", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 255 }),
  completedAt: timestamp("completed_at"),
  autoClosedAt: timestamp("auto_closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schema for exchanges
export const insertExchangeSchema = createInsertSchema(exchanges).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertExchange = z.infer<typeof insertExchangeSchema>;
export type SelectExchange = typeof exchanges.$inferSelect;

// Database table for rate history tracking
export const rateHistory = pgTable("rate_history", {
  id: serial("id").primaryKey(),
  fromCurrency: varchar("from_currency", { length: 50 }).notNull(),
  toCurrency: varchar("to_currency", { length: 50 }).notNull(),
  rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => ({
  pairTimeIdx: index("pair_time_idx").on(table.fromCurrency, table.toCurrency, table.recordedAt),
}));

// Insert schema for rate history
export const insertRateHistorySchema = createInsertSchema(rateHistory).omit({
  id: true,
  recordedAt: true,
});

// Types
export type InsertRateHistory = z.infer<typeof insertRateHistorySchema>;
export type SelectRateHistory = typeof rateHistory.$inferSelect;

// Rate history query response
export interface RateDataPoint {
  timestamp: number;
  rate: number;
}

// Network normalization helper (ChangeNOW API inconsistency workaround)
export function normalizeNetwork(network: string): string {
  const normalized = network.toLowerCase();
  // Map common blockchain names to ChangeNOW's expected format
  if (normalized === 'eth' || normalized === 'ethereum') return 'erc20';
  if (normalized === 'bsc' || normalized === 'bnb') return 'bep20';
  if (normalized === 'trx' || normalized === 'tron') return 'trc20';
  return normalized;
}
