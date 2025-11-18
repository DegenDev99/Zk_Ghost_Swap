import type {
  ExchangeProvider,
  ProviderCurrency,
  EstimateParams,
  ProviderEstimate,
  CreateExchangeParams,
  ProviderExchange,
  ProviderExchangeStatus,
} from "./types";
import crypto from "crypto";

const FIXEDFLOAT_API_KEY = process.env.FIXEDFLOAT_API_KEY;
const FIXEDFLOAT_API_SECRET = process.env.FIXEDFLOAT_API_SECRET;
const FIXEDFLOAT_API_URL = "https://fixedfloat.com/api/v2";

export class FixedFloatProvider implements ExchangeProvider {
  name = "FixedFloat";

  private generateSignature(data: any): string {
    const jsonData = JSON.stringify(data);
    return crypto
      .createHmac("sha256", FIXEDFLOAT_API_SECRET || "")
      .update(jsonData)
      .digest("hex");
  }

  private async makeRequest(endpoint: string, data?: any): Promise<any> {
    const requestData = data || {};
    const signature = this.generateSignature(requestData);

    const response = await fetch(`${FIXEDFLOAT_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-API-KEY": FIXEDFLOAT_API_KEY || "",
        "X-API-SIGN": signature,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.msg || `FixedFloat request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.msg || "FixedFloat API error");
    }

    return result.data;
  }

  async getCurrencies(): Promise<ProviderCurrency[]> {
    const data = await this.makeRequest("ccies");
    
    const currencies: ProviderCurrency[] = [];
    
    // FixedFloat returns currencies grouped by code
    for (const [code, info] of Object.entries(data)) {
      const currencyInfo = info as any;
      currencies.push({
        ticker: code.toLowerCase(),
        name: currencyInfo.name || code,
        network: currencyInfo.network,
        image: currencyInfo.logo,
      });
    }

    return currencies;
  }

  async getEstimate(params: EstimateParams): Promise<ProviderEstimate> {
    const { fromCurrency, toCurrency, fromAmount, type = 'float' } = params;

    const data = await this.makeRequest("price", {
      fromCcy: fromCurrency.toUpperCase(),
      toCcy: toCurrency.toUpperCase(),
      amount: parseFloat(fromAmount),
      direction: "from",
      type: type,
    });

    return {
      estimatedAmount: data.to.amount.toString(),
      rate: data.rate,
      provider: this.name,
    };
  }

  async createExchange(params: CreateExchangeParams): Promise<ProviderExchange> {
    const { fromCurrency, toCurrency, fromAmount, payoutAddress, type = 'float' } = params;

    const data = await this.makeRequest("create", {
      fromCcy: fromCurrency.toUpperCase(),
      toCcy: toCurrency.toUpperCase(),
      amount: parseFloat(fromAmount),
      direction: "from",
      type: type,
      toAddress: payoutAddress,
    });

    return {
      id: data.id,
      payinAddress: data.from.address,
      payoutAddress: data.to.address,
      fromCurrency: data.from.code.toLowerCase(),
      toCurrency: data.to.code.toLowerCase(),
      fromAmount: data.from.amount.toString(),
      toAmount: data.to.amount.toString(),
      status: this.normalizeStatus(data.status),
      validUntil: data.time?.left ? new Date(Date.now() + data.time.left * 1000).toISOString() : undefined,
      provider: this.name,
    };
  }

  async getExchangeStatus(id: string): Promise<ProviderExchangeStatus> {
    const data = await this.makeRequest("order", {
      id: id,
      token: "",  // Token is optional for status checks
    });

    return {
      status: this.normalizeStatus(data.status),
      payinHash: data.from?.txId,
      payoutHash: data.to?.txId,
      amountFrom: data.from?.amount?.toString(),
      amountTo: data.to?.amount?.toString(),
    };
  }

  // Normalize FixedFloat statuses to match ChangeNOW naming
  private normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      "NEW": "waiting",
      "PENDING": "confirming",
      "EXCHANGE": "exchanging",
      "WITHDRAW": "sending",
      "DONE": "finished",
      "EXPIRED": "expired",
      "EMERGENCY": "failed",
    };

    return statusMap[status] || status.toLowerCase();
  }
}
