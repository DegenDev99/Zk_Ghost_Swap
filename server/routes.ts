import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createExchangeSchema } from "@shared/schema";
import type { Currency, ExchangeAmount, Exchange } from "@shared/schema";

const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY;
const CHANGENOW_API_URL = "https://api.changenow.io/v2";

if (!CHANGENOW_API_KEY) {
  console.error("⚠️  CHANGENOW_API_KEY is not set in environment variables");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/swap/currencies - Fetch available currencies from ChangeNOW
  app.get("/api/swap/currencies", async (req, res) => {
    try {
      const response = await fetch(`${CHANGENOW_API_URL}/exchange/currencies?active=true`, {
        headers: {
          "x-changenow-api-key": CHANGENOW_API_KEY || "",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ChangeNOW] Currencies fetch failed:", response.status, errorText);
        return res.status(response.status).json({ 
          message: "Failed to fetch currencies from exchange service" 
        });
      }

      const currencies: Currency[] = await response.json();
      console.log(`[ChangeNOW] Fetched ${currencies.length} currencies`);
      
      res.json(currencies);
    } catch (error: any) {
      console.error("[ChangeNOW] Error fetching currencies:", error);
      res.status(500).json({ message: error.message || "Failed to fetch currencies" });
    }
  });

  // GET /api/swap/estimate - Get exchange rate estimate
  app.get("/api/swap/estimate", async (req, res) => {
    try {
      const { from, to, amount, fromNetwork, toNetwork } = req.query;

      if (!from || !to || !amount) {
        return res.status(400).json({ message: "Missing required parameters: from, to, amount" });
      }

      // Build currency codes with network if provided
      let fromCurrency = String(from).toLowerCase();
      let toCurrency = String(to).toLowerCase();

      if (fromNetwork) {
        fromCurrency = `${fromCurrency}_${String(fromNetwork).toLowerCase()}`;
      }
      if (toNetwork) {
        toCurrency = `${toCurrency}_${String(toNetwork).toLowerCase()}`;
      }

      console.log(`[ChangeNOW] Estimating: ${fromCurrency} -> ${toCurrency}, amount: ${amount}`);

      const response = await fetch(
        `${CHANGENOW_API_URL}/exchange/estimated-amount?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&fromAmount=${amount}&toAmount=&type=direct&flow=standard`,
        {
          headers: {
            "x-changenow-api-key": CHANGENOW_API_KEY || "",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error("[ChangeNOW] Estimate failed:", response.status, errorData);
        return res.status(response.status).json({ 
          message: errorData.message || "Failed to get exchange estimate" 
        });
      }

      const estimate: ExchangeAmount = await response.json();
      console.log(`[ChangeNOW] Estimate result:`, estimate);
      
      res.json(estimate);
    } catch (error: any) {
      console.error("[ChangeNOW] Error getting estimate:", error);
      res.status(500).json({ message: error.message || "Failed to get exchange estimate" });
    }
  });

  // POST /api/swap/exchange - Create new exchange transaction
  app.post("/api/swap/exchange", async (req, res) => {
    try {
      // Validate request body
      const validation = createExchangeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validation.error.errors 
        });
      }

      const { from, to, fromNetwork, toNetwork, amount, address } = validation.data;

      // Build currency codes with network if provided
      let fromCurrency = from.toLowerCase();
      let toCurrency = to.toLowerCase();

      if (fromNetwork) {
        fromCurrency = `${fromCurrency}_${fromNetwork.toLowerCase()}`;
      }
      if (toNetwork) {
        toCurrency = `${toCurrency}_${toNetwork.toLowerCase()}`;
      }

      console.log(`[ChangeNOW] Creating exchange: ${fromCurrency} -> ${toCurrency}, amount: ${amount}`);

      const exchangeData = {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        address,
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
        console.error("[ChangeNOW] Exchange creation failed:", response.status, errorData);
        return res.status(response.status).json({ 
          message: errorData.message || "Failed to create exchange" 
        });
      }

      const changeNowExchange: any = await response.json();
      console.log(`[ChangeNOW] Exchange created:`, changeNowExchange.id);

      // Calculate expiry time (ChangeNOW typically gives 20 minutes)
      const expiresAt = Date.now() + (20 * 60 * 1000); // 20 minutes from now

      // Map ChangeNOW response to our Exchange interface
      const exchange: Exchange = {
        id: changeNowExchange.id,
        payinAddress: changeNowExchange.payinAddress,
        payoutAddress: changeNowExchange.payoutAddress,
        fromCurrency: from.toLowerCase(),
        toCurrency: to.toLowerCase(),
        fromAmount: changeNowExchange.fromAmount || amount,
        toAmount: changeNowExchange.toAmount,
        status: changeNowExchange.status || "waiting",
        validUntil: changeNowExchange.validUntil,
        expiresAt,
      };

      // Store exchange in memory
      await storage.createExchange(exchange);

      res.json(exchange);
    } catch (error: any) {
      console.error("[ChangeNOW] Error creating exchange:", error);
      res.status(500).json({ message: error.message || "Failed to create exchange" });
    }
  });

  // GET /api/swap/status/:id - Get exchange status
  app.get("/api/swap/status/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Missing exchange ID" });
      }

      console.log(`[ChangeNOW] Fetching status for exchange: ${id}`);

      const response = await fetch(`${CHANGENOW_API_URL}/exchange/by-id?id=${id}`, {
        headers: {
          "x-changenow-api-key": CHANGENOW_API_KEY || "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error("[ChangeNOW] Status fetch failed:", response.status, errorData);
        return res.status(response.status).json({ 
          message: errorData.message || "Failed to fetch exchange status" 
        });
      }

      const statusData: any = await response.json();
      console.log(`[ChangeNOW] Status for ${id}:`, statusData.status);

      // Update local storage with latest status
      if (statusData.status) {
        await storage.updateExchangeStatus(id, statusData.status);
      }

      res.json({
        status: statusData.status,
        payinHash: statusData.payinHash,
        payoutHash: statusData.payoutHash,
        amountFrom: statusData.amountFrom,
        amountTo: statusData.amountTo,
      });
    } catch (error: any) {
      console.error("[ChangeNOW] Error fetching status:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exchange status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
