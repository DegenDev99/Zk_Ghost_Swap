// Exchange provider interface for multi-provider support
export interface ExchangeProvider {
  name: string;
  getCurrencies(): Promise<ProviderCurrency[]>;
  getEstimate(params: EstimateParams): Promise<ProviderEstimate>;
  createExchange(params: CreateExchangeParams): Promise<ProviderExchange>;
  getExchangeStatus(id: string): Promise<ProviderExchangeStatus>;
}

export interface ProviderCurrency {
  ticker: string;
  name: string;
  network?: string;
  image?: string;
}

export interface EstimateParams {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  type?: 'fixed' | 'float';
}

export interface ProviderEstimate {
  estimatedAmount: string;
  rate?: string;
  transactionSpeed?: string;
  warningMessage?: string;
  provider: string;
}

export interface CreateExchangeParams {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  payoutAddress: string;
  type?: 'fixed' | 'float';
}

export interface ProviderExchange {
  id: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  validUntil?: string;
  provider: string;
}

export interface ProviderExchangeStatus {
  status: string;
  payinHash?: string;
  payoutHash?: string;
  amountFrom?: string;
  amountTo?: string;
}
