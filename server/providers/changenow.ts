import type {
  ExchangeProvider,
  ProviderCurrency,
  EstimateParams,
  ProviderEstimate,
  CreateExchangeParams,
  ProviderExchange,
  ProviderExchangeStatus,
} from "./types";

const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY;
const CHANGENOW_API_URL = "https://api.changenow.io/v2";

export class ChangeNowProvider implements ExchangeProvider {
  name = "ChangeNOW";

  async getCurrencies(): Promise<ProviderCurrency[]> {
    const response = await fetch(`${CHANGENOW_API_URL}/exchange/currencies?active=true`, {
      headers: {
        "x-changenow-api-key": CHANGENOW_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`ChangeNOW currencies fetch failed: ${response.status}`);
    }

    const currencies = await response.json();
    return currencies.map((c: any) => ({
      ticker: c.ticker,
      name: c.name,
      network: c.network,
      image: c.image,
    }));
  }

  async getEstimate(params: EstimateParams): Promise<ProviderEstimate> {
    const { fromCurrency, toCurrency, fromAmount } = params;

    const response = await fetch(
      `${CHANGENOW_API_URL}/exchange/estimated-amount?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&fromAmount=${fromAmount}&toAmount=&type=direct&flow=standard`,
      {
        headers: {
          "x-changenow-api-key": CHANGENOW_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || "ChangeNOW estimate failed");
    }

    const estimate = await response.json();
    return {
      estimatedAmount: estimate.estimatedAmount,
      transactionSpeed: estimate.transactionSpeedForecast,
      warningMessage: estimate.warningMessage,
      provider: this.name,
    };
  }

  async createExchange(params: CreateExchangeParams): Promise<ProviderExchange> {
    const { fromCurrency, toCurrency, fromAmount, payoutAddress } = params;

    const exchangeData = {
      fromCurrency,
      toCurrency,
      fromAmount,
      address: payoutAddress,
      flow: "standard",
      type: "direct",
    };

    const response = await fetch(`${CHANGENOW_API_URL}/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-changenow-api-key": CHANGENOW_API_KEY || "",
      },
      body: JSON.stringify(exchangeData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || "ChangeNOW exchange creation failed");
    }

    const data = await response.json();
    
    return {
      id: data.id,
      payinAddress: data.payinAddress,
      payoutAddress: data.payoutAddress,
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      fromAmount: data.fromAmount,
      toAmount: data.toAmount,
      status: data.status,
      validUntil: data.validUntil,
      provider: this.name,
    };
  }

  async getExchangeStatus(id: string): Promise<ProviderExchangeStatus> {
    const response = await fetch(`${CHANGENOW_API_URL}/exchange/by-id?id=${id}`, {
      headers: {
        "x-changenow-api-key": CHANGENOW_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`ChangeNOW status fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      payinHash: data.payinHash,
      payoutHash: data.payoutHash,
      amountFrom: data.amountFrom,
      amountTo: data.amountTo,
    };
  }
}
