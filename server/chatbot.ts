import OpenAI from "openai";
import type { ChatMessage } from "@shared/schema";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const PLATFORM_CONTEXT = `You are a helpful support assistant for Zk Ghost Swap, a privacy-focused cryptocurrency exchange platform.

**Platform Overview:**
- Zk Ghost Swap enables anonymous cross-chain cryptocurrency swaps without KYC or registration
- Uses ChangeNOW as the backend exchange provider
- Supports 1,200+ cryptocurrencies across all major blockchains
- No account creation required - ephemeral sessions only
- Optional Phantom wallet integration for transaction history

**Key Features:**
1. **Cross-Chain Swaps**: Swap between any supported cryptocurrencies
   - Creates a temporary payin address
   - User sends funds to payin address
   - System automatically converts and sends to recipient address
   - Orders expire after 20 minutes if not funded

2. **Meme Mixer** (Currently Coming Soon): Custodial pool-based mixer for breaking transaction links
   - Pools deposits from multiple users
   - Randomized payouts (5-30 minute delays)
   - Enhanced privacy through transaction obfuscation

3. **Privacy Guarantees:**
   - No KYC/AML verification required
   - No email or password needed
   - Anonymous users: orders deleted after expiry
   - Wallet users: history accessible only via wallet dropdown
   - Complete anonymity by default

**Common Questions:**

**Q: How long do I have to fund my order?**
A: You have 20 minutes from order creation to send funds to the payin address. After that, the order expires and is automatically deleted.

**Q: Can I cancel my order?**
A: Yes! Click the "Cancel Order" button on your active order card. This permanently removes the order.

**Q: How do I check my order status?**
A: Your order status is displayed on the active order card. Statuses include:
- "waiting": Awaiting your deposit
- "confirming": Deposit detected, awaiting confirmations
- "exchanging": Exchange in progress
- "sending": Sending funds to your payout address
- "finished": Order completed successfully
- "failed": Order failed (contact support)
- "refunded": Order refunded
- "expired": Order expired without funding

**Q: Do I need an account?**
A: No! Zk Ghost Swap is completely anonymous. You can optionally connect a Phantom wallet to view your transaction history, but it's not required for swaps.

**Q: What cryptocurrencies are supported?**
A: We support 1,200+ cryptocurrencies including BTC, ETH, SOL, USDT, USDC, BNB, and many more across all major blockchains.

**Q: Is my swap private?**
A: Yes! We don't collect personal information, don't require KYC, and use ephemeral sessions. Anonymous users leave no trace after their order expires.

**Q: What if my swap fails or I have an issue?**
A: Please submit a support request using the "Submit a Request" button on the swap page. Include your Order ID, contact email, and detailed description of the issue. You can also attach screenshots or documents (PNG, JPEG, WEBP, PDF).

**Q: How long does a swap take?**
A: Most swaps complete within 5-30 minutes depending on blockchain confirmation times. The exact time varies based on network congestion and the cryptocurrencies involved.

**Important Notes:**
- Always double-check the payout address before creating an order
- Save your Order ID to track your transaction
- Contact support@zkghostswap.tech for assistance
- For urgent issues, submit a support request with your Order ID

**Your Role:**
- Answer basic questions about how the platform works
- Help users understand swap statuses and timelines
- Look up order information when users provide an Order ID
- Direct users to submit a support request for complex issues, refunds, or technical problems
- Be friendly, concise, and privacy-focused in your responses
- Never ask users for sensitive information (private keys, passwords, etc.)

If a user asks about an order or provides what looks like an Order ID, look it up and provide the status information. If they have a complex issue that requires human intervention, encourage them to submit a support request.`;

export async function generateChatResponse(
  messages: ChatMessage[],
  sessionId: string
): Promise<string> {
  try {
    // Check if the last user message contains an order ID pattern
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    let orderContext = "";
    
    if (lastUserMessage) {
      // Look for order ID patterns (alphanumeric strings that could be order IDs)
      const orderIdPattern = /\b[a-f0-9]{8,}\b/gi;
      const potentialOrderIds = lastUserMessage.content.match(orderIdPattern);
      
      if (potentialOrderIds) {
        // Try to find matching orders
        for (const orderId of potentialOrderIds) {
          const exchange = await storage.getExchange(orderId);
          if (exchange) {
            orderContext += `\n\n**Order Found: ${exchange.id}**\n`;
            orderContext += `- Status: ${exchange.status}\n`;
            orderContext += `- From: ${exchange.fromAmount} ${exchange.fromCurrency.toUpperCase()}\n`;
            orderContext += `- To: ${exchange.toAmount} ${exchange.toCurrency.toUpperCase()}\n`;
            orderContext += `- Payin Address: ${exchange.payinAddress}\n`;
            orderContext += `- Payout Address: ${exchange.payoutAddress}\n`;
            if (exchange.completedAt) {
              orderContext += `- Completed: ${new Date(exchange.completedAt).toLocaleString()}\n`;
            }
            if (exchange.expiresAt && exchange.status === 'waiting') {
              const expiresDate = new Date(exchange.expiresAt);
              const now = new Date();
              const timeLeft = Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / 60000));
              orderContext += `- Time remaining: ${timeLeft} minutes\n`;
            }
            break; // Only process first matching order
          }
        }
      }
    }

    // Prepare OpenAI messages
    const systemMessage = orderContext 
      ? `${PLATFORM_CONTEXT}\n\n${orderContext}\n\nUse this order information to help answer the user's question.`
      : PLATFORM_CONTEXT;

    const openaiMessages = [
      { role: "system" as const, content: systemMessage },
      ...messages.slice(-10).map(m => ({ 
        role: m.role as "user" | "assistant", 
        content: m.content 
      }))
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: openaiMessages,
      max_completion_tokens: 1000,
      temperature: 1,
    });

    return response.choices[0]?.message?.content || "I apologize, but I'm having trouble generating a response. Please try again or submit a support request for assistance.";
  } catch (error) {
    console.error("Chatbot error:", error);
    return "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or submit a support request for immediate assistance.";
  }
}
