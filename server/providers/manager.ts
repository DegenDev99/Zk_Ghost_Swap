import type { ExchangeProvider, ProviderEstimate, EstimateParams } from "./types";
import { ChangeNowProvider } from "./changenow";
import { FixedFloatProvider } from "./fixedfloat";

export class ProviderManager {
  private providers: ExchangeProvider[] = [];
  private providerMap: Map<string, ExchangeProvider> = new Map();

  constructor() {
    // Initialize available providers
    const changeNow = new ChangeNowProvider();
    const fixedFloat = new FixedFloatProvider();

    this.providers.push(changeNow);
    this.providerMap.set(changeNow.name, changeNow);

    // Only add FixedFloat if API keys are configured
    if (process.env.FIXEDFLOAT_API_KEY && process.env.FIXEDFLOAT_API_SECRET) {
      this.providers.push(fixedFloat);
      this.providerMap.set(fixedFloat.name, fixedFloat);
    }
  }

  getProvider(name: string): ExchangeProvider | undefined {
    return this.providerMap.get(name);
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  async getAllEstimates(params: EstimateParams): Promise<ProviderEstimate[]> {
    const estimates: ProviderEstimate[] = [];

    // Fetch estimates from all providers in parallel
    const results = await Promise.allSettled(
      this.providers.map(async (provider) => {
        try {
          return await provider.getEstimate(params);
        } catch (error: any) {
          console.error(`[${provider.name}] Estimate failed:`, error.message);
          return null;
        }
      })
    );

    // Collect successful estimates
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        estimates.push(result.value);
      }
    }

    return estimates;
  }

  getBestEstimate(estimates: ProviderEstimate[]): ProviderEstimate | null {
    if (estimates.length === 0) return null;

    // Best estimate = highest output amount
    return estimates.reduce((best, current) => {
      const bestAmount = parseFloat(best.estimatedAmount);
      const currentAmount = parseFloat(current.estimatedAmount);
      return currentAmount > bestAmount ? current : best;
    });
  }
}

// Singleton instance
export const providerManager = new ProviderManager();
