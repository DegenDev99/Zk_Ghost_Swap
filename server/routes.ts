import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createExchangeSchema, createMixerOrderSchema, normalizeNetwork, createSupportTicketSchema, type AttachmentMetadata } from "@shared/schema";
import type { Currency, ExchangeAmount, Exchange, MixerOrder } from "@shared/schema";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import CryptoJS from "crypto-js";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY;
const CHANGENOW_API_URL = "https://api.changenow.io/v2";

// Encryption key for private keys - REQUIRED for security
const ENCRYPTION_KEY = process.env.MIXER_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('[FATAL] MIXER_ENCRYPTION_KEY environment variable is required for custodial mixer security');
  console.error('[FATAL] Mixer service cannot start without encryption key - aborting');
  process.exit(1);
}

// Master fee payer wallet - sponsors transaction fees for mixer
const MIXER_FEE_PAYER_KEY = process.env.MIXER_FEE_PAYER_KEY;

// Load the master fee payer keypair if provided
let masterFeePayerKeypair: Keypair | null = null;
if (MIXER_FEE_PAYER_KEY) {
  try {
    masterFeePayerKeypair = Keypair.fromSecretKey(bs58.decode(MIXER_FEE_PAYER_KEY));
    console.log('[Mixer] Master fee payer wallet loaded:', masterFeePayerKeypair.publicKey.toBase58());
    console.log('[Mixer] All transaction fees will be sponsored by master wallet');
  } catch (error) {
    console.error('[WARNING] Invalid MIXER_FEE_PAYER_KEY format - must be base58 encoded private key');
    console.error('[WARNING] Mixer payouts will require deposit addresses to have SOL for fees');
  }
} else {
  console.warn('[WARNING] MIXER_FEE_PAYER_KEY not set - deposit addresses must have SOL for transaction fees');
}

// Helper function to encrypt private keys
function encryptPrivateKey(privateKey: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not available');
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
}

// Helper function to decrypt private keys
function decryptPrivateKey(encryptedKey: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not available');
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

if (!CHANGENOW_API_KEY) {
  console.error("⚠️  CHANGENOW_API_KEY is not set in environment variables");
}

// Configure multer for file uploads (support ticket attachments)
const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'support');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 3, // Max 3 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, WEBP, and PDF are allowed.'));
    }
  }
});

// Configure nodemailer for email notifications
const emailTransporter = nodemailer.createTransport({
  host: process.env.SUPPORT_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SUPPORT_SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.SUPPORT_SMTP_USER,
    pass: process.env.SUPPORT_SMTP_PASS,
  },
});

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

      const fromCurrency = String(from).toLowerCase();
      const toCurrency = String(to).toLowerCase();

      // Build API URL with network as separate parameters (ChangeNOW v2 format)
      const params = new URLSearchParams({
        fromCurrency,
        toCurrency,
        fromAmount: String(amount),
        toAmount: '',
        type: 'direct',
        flow: 'standard',
      });

      // Add network parameters if provided
      if (fromNetwork) {
        params.append('fromNetwork', String(fromNetwork).toLowerCase());
      }
      if (toNetwork) {
        params.append('toNetwork', String(toNetwork).toLowerCase());
      }

      console.log(`[ChangeNOW] Estimating: ${fromCurrency} (${fromNetwork || 'default'}) -> ${toCurrency} (${toNetwork || 'default'}), amount: ${amount}`);

      const response = await fetch(
        `${CHANGENOW_API_URL}/exchange/estimated-amount?${params.toString()}`,
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

      const fromCurrency = from.toLowerCase();
      const toCurrency = to.toLowerCase();

      console.log(`[ChangeNOW] Creating exchange: ${fromCurrency} (${fromNetwork || 'default'}) -> ${toCurrency} (${toNetwork || 'default'}), amount: ${amount}`);

      // Build exchange data with network as separate fields (ChangeNOW v2 format)
      const exchangeData: any = {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        address,
        flow: "standard",
        type: "direct",
      };

      // Add network fields if provided
      if (fromNetwork) {
        exchangeData.fromNetwork = fromNetwork.toLowerCase();
      }
      if (toNetwork) {
        exchangeData.toNetwork = toNetwork.toLowerCase();
      }

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

  // POST /api/mixer/order - Create a new custodial mixer order
  app.post("/api/mixer/order", async (req, res) => {
    try {
      // Validate request body
      const validation = createMixerOrderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validation.error.errors 
        });
      }

      const { tokenMint, amount, recipientAddress } = validation.data;
      const { sessionId, walletAddress, senderAddress } = req.body;

      // Generate unique order ID using timestamp + random
      const orderId = `MIX-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Generate a new Solana keypair for this order's deposit address
      const depositKeypair = Keypair.generate();
      const depositAddress = depositKeypair.publicKey.toBase58();
      const depositPrivateKeyBytes = depositKeypair.secretKey;
      const depositPrivateKeyBase58 = bs58.encode(depositPrivateKeyBytes);
      
      // Encrypt the private key before storing
      const encryptedPrivateKey = encryptPrivateKey(depositPrivateKeyBase58);

      // Calculate expiry time (20 minutes from now)
      const expiresAt = Date.now() + (20 * 60 * 1000);

      console.log(`[Mixer] Creating custodial order: ${orderId}`);
      console.log(`[Mixer] Deposit address: ${depositAddress}`);
      console.log(`[Mixer] Token: ${tokenMint}, Amount: ${amount}`);

      const mixerOrder: MixerOrder = {
        id: Date.now(), // Temporary ID, will be replaced by database serial
        orderId,
        tokenMint,
        amount,
        senderAddress: senderAddress || walletAddress || '',
        recipientAddress,
        depositAddress,
        depositPrivateKey: encryptedPrivateKey,
        status: 'pending',
        expiresAt,
        sessionId,
        walletAddress,
      };

      await storage.createMixerOrder(mixerOrder, sessionId, walletAddress);

      console.log(`[Mixer] Order created: ${orderId}, expires at ${new Date(expiresAt).toISOString()}`);

      // Don't send private key to frontend
      const responseOrder = { ...mixerOrder };
      delete (responseOrder as any).depositPrivateKey;

      res.json(responseOrder);
    } catch (error: any) {
      console.error("[Mixer] Error creating order:", error);
      res.status(500).json({ message: error.message || "Failed to create mixer order" });
    }
  });

  // GET /api/mixer/check-deposit/:orderId - Check if deposit has been received
  app.get("/api/mixer/check-deposit/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ message: "Missing orderId" });
      }

      const order = await storage.getMixerOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // If already deposited, return the cached info
      if (order.depositedAmount && order.depositedAt) {
        return res.json({
          deposited: true,
          amount: order.depositedAmount,
          depositedAt: order.depositedAt,
          signature: order.depositTxSignature,
        });
      }

      // Check Solana balance for the deposit address
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { getAccount, getAssociatedTokenAddress } = await import("@solana/spl-token");
      
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const depositPubkey = new PublicKey(order.depositAddress);
      const tokenMintPubkey = new PublicKey(order.tokenMint);
      
      try {
        // Get the associated token account for this deposit address
        const ata = await getAssociatedTokenAddress(
          tokenMintPubkey,
          depositPubkey,
          false // allowOwnerOffCurve
        );
        
        const tokenAccount = await getAccount(connection, ata);
        const balance = tokenAccount.amount.toString();
        
        console.log(`[Mixer] Deposit check for ${orderId}: balance = ${balance}`);
        
        // If balance matches or exceeds expected amount, mark as deposited
        if (BigInt(balance) >= BigInt(order.amount)) {
          const now = new Date().toISOString();
          await storage.updateMixerDeposit(orderId, balance, now);
          
          // Schedule payout (randomized delay 5-30 minutes)
          const delayMinutes = 5 + Math.floor(Math.random() * 25);
          const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          await storage.scheduleMixerPayout(orderId, scheduledAt);
          
          console.log(`[Mixer] Deposit confirmed for ${orderId}, payout scheduled in ${delayMinutes}min`);
          
          return res.json({
            deposited: true,
            amount: balance,
            depositedAt: now,
            payoutScheduledIn: delayMinutes,
          });
        }
        
        res.json({ deposited: false, balance });
      } catch (accountError: any) {
        // Account doesn't exist yet (no tokens sent)
        console.log(`[Mixer] No deposit yet for ${orderId}: ${accountError.message}`);
        res.json({ deposited: false, balance: "0" });
      }
    } catch (error: any) {
      console.error("[Mixer] Error checking deposit:", error);
      res.status(500).json({ message: error.message || "Failed to check deposit" });
    }
  });

  // POST /api/mixer/auto-close/:id - Permanently cancel/close a mixer order
  app.post("/api/mixer/auto-close/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Missing order ID" });
      }

      await storage.markMixerOrderAutoClosed(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Mixer] Error auto-closing order:", error);
      res.status(500).json({ message: error.message || "Failed to auto-close order" });
    }
  });

  // POST /api/support/tickets - Create a new support ticket
  app.post("/api/support/tickets", upload.array('attachments', 3), async (req, res) => {
    const uploadedFiles: Express.Multer.File[] = (req.files as Express.Multer.File[]) || [];
    
    try {
      // Parse form data
      const { contactEmail, orderId, description } = req.body;

      // Validate form data using zod schema
      const validation = createSupportTicketSchema.safeParse({
        contactEmail,
        orderId: orderId || undefined,
        description,
      });

      if (!validation.success) {
        // Clean up uploaded files on validation failure
        for (const file of uploadedFiles) {
          fs.unlinkSync(file.path);
        }
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      // Build attachment metadata
      const attachments: AttachmentMetadata[] = uploadedFiles.map(file => ({
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
      }));

      // Store ticket in database
      const ticket = await storage.createSupportTicket(
        validation.data.contactEmail,
        validation.data.orderId,
        validation.data.description,
        attachments
      );

      // Send email notification (non-blocking)
      if (process.env.SUPPORT_SMTP_USER && process.env.SUPPORT_SMTP_PASS) {
        emailTransporter.sendMail({
          from: process.env.SUPPORT_SMTP_USER,
          to: 'support@zkghostswap.tech',
          subject: `New Support Request #${ticket.id}${orderId ? ` - Order ${orderId}` : ''}`,
          html: `
            <h2>New Support Request</h2>
            <p><strong>Ticket ID:</strong> ${ticket.id}</p>
            <p><strong>Contact Email:</strong> ${validation.data.contactEmail}</p>
            ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
            <p><strong>Description:</strong></p>
            <p>${validation.data.description.replace(/\n/g, '<br>')}</p>
            ${attachments.length > 0 ? `
              <p><strong>Attachments:</strong></p>
              <ul>
                ${attachments.map(a => `<li>${a.originalName} (${(a.size / 1024).toFixed(2)} KB)</li>`).join('')}
              </ul>
            ` : ''}
            <p><em>Submitted at: ${new Date().toISOString()}</em></p>
          `,
          attachments: uploadedFiles.map(file => ({
            filename: file.originalname,
            path: file.path,
          })),
        }).catch(emailError => {
          console.error('[Support] Failed to send email notification:', emailError);
        });
      }

      console.log(`[Support] Ticket created: #${ticket.id} from ${validation.data.contactEmail}`);

      res.status(201).json({ 
        success: true, 
        ticketId: ticket.id,
        message: "Support request submitted successfully" 
      });
    } catch (error: any) {
      console.error("[Support] Error creating ticket:", error);
      
      // Clean up uploaded files on error
      for (const file of uploadedFiles) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('[Support] Failed to clean up file:', file.path);
        }
      }
      
      res.status(500).json({ message: error.message || "Failed to create support ticket" });
    }
  });

  // Background payout processor - runs every minute
  async function processScheduledPayouts() {
    try {
      // Get all mixer orders ready for payout
      const orders = await storage.getAllMixerOrders();
      const now = Date.now();

      for (const order of orders) {
        // Skip if not in deposited state or no scheduled payout time
        if (order.status !== 'deposited' || !order.payoutScheduledAt) {
          continue;
        }

        const scheduledTime = new Date(order.payoutScheduledAt).getTime();
        
        // Check if it's time to execute payout
        if (now >= scheduledTime) {
          console.log(`[Mixer] Executing payout for order ${order.orderId}`);
          
          try {
            // Mark as processing
            await storage.updateMixerOrderStatus(order.orderId, 'processing');

            // Decrypt the private key
            const privateKeyStr = decryptPrivateKey(order.depositPrivateKey);
            const depositKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyStr));

            // Execute payout
            const { Connection, PublicKey, Transaction, SystemProgram } = await import("@solana/web3.js");
            const { 
              getAssociatedTokenAddress, 
              createAssociatedTokenAccountInstruction,
              createTransferInstruction,
              getAccount
            } = await import("@solana/spl-token");

            const connection = new Connection("https://api.mainnet-beta.solana.com");
            const tokenMintPubkey = new PublicKey(order.tokenMint);
            const recipientPubkey = new PublicKey(order.recipientAddress);

            // Get source and destination token accounts
            const sourceATA = await getAssociatedTokenAddress(
              tokenMintPubkey,
              depositKeypair.publicKey,
              false
            );

            const destinationATA = await getAssociatedTokenAddress(
              tokenMintPubkey,
              recipientPubkey,
              false
            );

            // Build transaction
            const transaction = new Transaction();

            // Determine who pays fees
            const feePayerKeypair = masterFeePayerKeypair || depositKeypair;
            const usesMasterWallet = masterFeePayerKeypair !== null;

            // Check if recipient ATA exists
            try {
              await getAccount(connection, destinationATA);
            } catch {
              // Create recipient ATA if it doesn't exist
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  feePayerKeypair.publicKey,
                  destinationATA,
                  recipientPubkey,
                  tokenMintPubkey
                )
              );
            }

            // Get source account to determine amount
            const sourceAccount = await getAccount(connection, sourceATA);
            const transferAmount = sourceAccount.amount;

            // Add transfer instruction
            transaction.add(
              createTransferInstruction(
                sourceATA,
                destinationATA,
                depositKeypair.publicKey,
                transferAmount
              )
            );

            // Get recent blockhash and set fee payer
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = feePayerKeypair.publicKey;

            // Sign transaction
            if (usesMasterWallet && masterFeePayerKeypair) {
              // Sign with BOTH wallets:
              // 1. depositKeypair authorizes token transfer
              // 2. masterFeePayerKeypair pays transaction fees
              transaction.sign(depositKeypair, masterFeePayerKeypair);
            } else {
              // Only deposit keypair signs (also pays fees from deposit address)
              transaction.sign(depositKeypair);
            }
            
            const signature = await connection.sendRawTransaction(transaction.serialize());
            
            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            console.log(`[Mixer] Payout completed for ${order.orderId}: ${signature}`);

            // Update order status
            await storage.updateMixerOrderStatus(order.orderId, 'completed');
            await storage.updateMixerPayoutSignature(order.orderId, signature);

          } catch (payoutError: any) {
            console.error(`[Mixer] Payout failed for ${order.orderId}:`, payoutError);
            // Mark as failed but keep trying on next cycle
            await storage.updateMixerOrderStatus(order.orderId, 'deposited');
          }
        }
      }
    } catch (error: any) {
      console.error("[Mixer] Error in payout processor:", error);
    }
  }

  // Start payout processor - runs every 30 seconds
  setInterval(processScheduledPayouts, 30000);
  console.log('[Mixer] Payout processor started (runs every 30 seconds)');

  const httpServer = createServer(app);
  return httpServer;
}
