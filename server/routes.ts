import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createExchangeSchema, normalizeNetwork } from "@shared/schema";
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
      // ChangeNOW uses format: ticker or ticker_network (e.g., usdt_erc20)
      let fromCurrency = String(from).toLowerCase();
      let toCurrency = String(to).toLowerCase();

      // Only append network if it exists AND is different from the ticker
      // This prevents duplicates like "btc_btc"
      if (fromNetwork && String(fromNetwork).toLowerCase() !== fromCurrency) {
        const normalizedNetwork = normalizeNetwork(String(fromNetwork));
        fromCurrency = `${fromCurrency}_${normalizedNetwork}`;
      }
      if (toNetwork && String(toNetwork).toLowerCase() !== toCurrency) {
        const normalizedNetwork = normalizeNetwork(String(toNetwork));
        toCurrency = `${toCurrency}_${normalizedNetwork}`;
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
      
      // Record the exchange rate for historical tracking
      if (estimate.estimatedAmount) {
        const amountNum = parseFloat(String(amount));
        const estimatedNum = parseFloat(estimate.estimatedAmount);
        if (!isNaN(amountNum) && !isNaN(estimatedNum) && amountNum > 0) {
          const rate = estimatedNum / amountNum;
          // Record rate asynchronously without blocking response
          storage.recordRate(fromCurrency, toCurrency, rate).catch((err) => {
            console.error("[Rate History] Failed to record rate:", err);
          });
        }
      }
      
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
      const { sessionId, walletAddress } = req.body;

      // Build currency codes with network if provided
      // ChangeNOW uses format: ticker or ticker_network (e.g., usdt_erc20)
      let fromCurrency = from.toLowerCase();
      let toCurrency = to.toLowerCase();

      // Only append network if it exists AND is different from the ticker
      // This prevents duplicates like "btc_btc"
      if (fromNetwork && fromNetwork.toLowerCase() !== fromCurrency) {
        const normalizedNetwork = normalizeNetwork(fromNetwork);
        fromCurrency = `${fromCurrency}_${normalizedNetwork}`;
      }
      if (toNetwork && toNetwork.toLowerCase() !== toCurrency) {
        const normalizedNetwork = normalizeNetwork(toNetwork);
        toCurrency = `${toCurrency}_${normalizedNetwork}`;
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

      // Store exchange with session and wallet tracking
      await storage.createExchange(exchange, sessionId, walletAddress);

      res.json(exchange);
    } catch (error: any) {
      console.error("[ChangeNOW] Error creating exchange:", error);
      res.status(500).json({ message: error.message || "Failed to create exchange" });
    }
  });

  // GET /api/swap/history - Get all exchanges
  app.get("/api/swap/history", async (req, res) => {
    try {
      const exchanges = await storage.getAllExchanges();
      res.json(exchanges);
    } catch (error: any) {
      console.error("[Storage] Error fetching exchange history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exchange history" });
    }
  });

  // GET /api/swap/active-order - Get active order by session ID
  app.get("/api/swap/active-order", async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const exchange = await storage.getActiveExchangeBySession(String(sessionId));
      res.json(exchange || null);
    } catch (error: any) {
      console.error("[Storage] Error fetching active order:", error);
      res.status(500).json({ message: error.message || "Failed to fetch active order" });
    }
  });

  // GET /api/swap/rate-history - Get rate history for a currency pair
  app.get("/api/swap/rate-history", async (req, res) => {
    try {
      const { from, to, hours = "24" } = req.query;

      if (!from || !to) {
        return res.status(400).json({ message: "Missing required parameters: from, to" });
      }

      const fromCurrency = String(from).toLowerCase();
      const toCurrency = String(to).toLowerCase();
      const hoursNum = parseInt(String(hours));

      if (isNaN(hoursNum) || hoursNum <= 0) {
        return res.status(400).json({ message: "Invalid hours parameter" });
      }

      console.log(`[Rate History] Fetching ${hoursNum}h history for ${fromCurrency} -> ${toCurrency}`);

      const history = await storage.getRateHistory(fromCurrency, toCurrency, hoursNum);
      
      res.json(history);
    } catch (error: any) {
      console.error("[Rate History] Error fetching rate history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch rate history" });
    }
  });

  // POST /api/swap/auto-close/:id - Mark exchange as auto-closed
  app.post("/api/swap/auto-close/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Missing exchange ID" });
      }

      await storage.markExchangeAutoClosed(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Storage] Error auto-closing exchange:", error);
      res.status(500).json({ message: error.message || "Failed to auto-close exchange" });
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
        
        // Mark as completed if status is 'finished'
        if (statusData.status === 'finished') {
          await storage.markExchangeCompleted(id);
        }
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
