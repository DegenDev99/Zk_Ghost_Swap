import { z } from "zod";

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
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  validUntil?: string;
  expiresAt?: number; // Server-provided expiry timestamp
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
