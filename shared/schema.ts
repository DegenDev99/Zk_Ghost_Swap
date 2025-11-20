import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, numeric, index, jsonb } from "drizzle-orm/pg-core";
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

// Mixer Order interface (custodial pool architecture)
export interface MixerOrder {
  id: number;
  orderId: string;
  tokenMint: string;
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  
  // Custodial deposit address
  depositAddress: string;
  depositPrivateKey: string; // Encrypted
  
  // Deposit tracking
  depositedAmount?: string | null;
  depositedAt?: string | null;
  depositTxSignature?: string | null;
  
  // Payout tracking
  payoutScheduledAt?: string | null;
  payoutExecutedAt?: string | null;
  payoutTxSignature?: string | null;
  
  status: string;
  expiresAt: number;
  sessionId?: string | null;
  walletAddress?: string | null;
  completedAt?: string | null;
  autoClosedAt?: string | null;
}

// Database table for mixer orders (custodial pool architecture)
export const mixerOrders = pgTable("mixer_orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 255 }).notNull().unique(),
  tokenMint: varchar("token_mint", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 100 }).notNull(),
  senderAddress: varchar("sender_address", { length: 255 }).notNull(),
  recipientAddress: varchar("recipient_address", { length: 255 }).notNull(),
  
  // Custodial deposit address (backend-controlled)
  depositAddress: varchar("deposit_address", { length: 255 }).notNull(),
  depositPrivateKey: text("deposit_private_key").notNull(), // Encrypted
  
  // Deposit tracking
  depositedAmount: varchar("deposited_amount", { length: 100 }),
  depositedAt: timestamp("deposited_at"),
  depositTxSignature: varchar("deposit_tx_signature", { length: 255 }),
  
  // Payout tracking
  payoutScheduledAt: timestamp("payout_scheduled_at"),
  payoutExecutedAt: timestamp("payout_executed_at"),
  payoutTxSignature: varchar("payout_tx_signature", { length: 255 }),
  
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, deposited, processing, completed, expired, cancelled
  expiresAt: varchar("expires_at", { length: 100 }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 255 }),
  completedAt: timestamp("completed_at"),
  autoClosedAt: timestamp("auto_closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schema for mixer orders
export const insertMixerOrderSchema = createInsertSchema(mixerOrders).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertMixerOrder = z.infer<typeof insertMixerOrderSchema>;
export type SelectMixerOrder = typeof mixerOrders.$inferSelect;

// Mixer order creation input
export const createMixerOrderSchema = z.object({
  tokenMint: z.string().min(32, "Invalid token mint address"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  recipientAddress: z.string().min(32, "Invalid recipient address"),
});

export type CreateMixerOrderInput = z.infer<typeof createMixerOrderSchema>;

// Network normalization helper (ChangeNOW API inconsistency workaround)
export function normalizeNetwork(network: string): string {
  const normalized = network.toLowerCase();
  // Map common blockchain names to ChangeNOW's expected format
  if (normalized === 'eth' || normalized === 'ethereum') return 'erc20';
  if (normalized === 'bsc' || normalized === 'bnb') return 'bep20';
  if (normalized === 'trx' || normalized === 'tron') return 'trc20';
  return normalized;
}

// Support ticket attachment metadata
export interface AttachmentMetadata {
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
}

// Database table for support tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  description: text("description").notNull(),
  attachments: jsonb("attachments").$type<AttachmentMetadata[]>().default([]),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schema for support tickets
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
});

// Frontend validation schema (extends insert schema)
export const createSupportTicketSchema = z.object({
  contactEmail: z.string().email("Invalid email address"),
  orderId: z.string().max(255).optional().transform(val => val?.trim() || undefined),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description too long"),
});

// Types
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SelectSupportTicket = typeof supportTickets.$inferSelect;

// Chat sessions table for storing chatbot conversations
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schema for chat sessions
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type SelectChatSession = typeof chatSessions.$inferSelect;

// Chat message interface
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// Chat request validation
export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  sessionId: z.string().min(1, "Session ID required"),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
