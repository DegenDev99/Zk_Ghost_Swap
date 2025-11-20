import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle, 
  Clock, 
  Shield, 
  Copy, 
  Check, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { PrivacyVisualization } from "@/components/PrivacyVisualization";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MixerOrder } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Buffer } from "buffer";

// Polyfill Buffer for Solana web3.js
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export default function MemeMixerPage() {
  const { toast } = useToast();
  const { walletAddress, signTransaction } = useWallet();
  
  // Form state
  const [tokenMint, setTokenMint] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  
  // Active order state
  const [activeOrder, setActiveOrder] = useState<MixerOrder | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { tokenMint: string; amount: string; recipientAddress: string }) => {
      const res = await apiRequest("POST", "/api/mixer/order", {
        ...data,
        senderAddress: walletAddress,
        walletAddress,
      });
      return await res.json();
    },
    onSuccess: (data: MixerOrder) => {
      setActiveOrder(data);
      toast({
        title: "Order Created!",
        description: "Your confidential transfer order is ready. Execute it within 20 minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create mixer order",
        variant: "destructive",
      });
    },
  });

  // Timer countdown and auto-close on expiry
  useEffect(() => {
    if (!activeOrder || !activeOrder.expiresAt) {
      setTimeRemaining("20:00");
      return;
    }

    const expiryTime = activeOrder.expiresAt;

    const updateTimer = async () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        
        // Auto-close expired order
        try {
          await apiRequest("POST", `/api/mixer/auto-close/${activeOrder.orderId}`);
          setActiveOrder(null);
          toast({
            title: "Order Expired",
            description: "Your mixer order has expired and been closed",
          });
        } catch (error) {
          console.error("Failed to auto-close expired order:", error);
        }
        
        return false;
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        return true;
      }
    };

    updateTimer();

    const interval = setInterval(() => {
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOrder?.expiresAt, activeOrder?.orderId, toast]);

  // Deposit polling - check for deposits every 10 seconds
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'pending') {
      return;
    }

    const checkDeposit = async () => {
      try {
        const response = await fetch(`/api/mixer/check-deposit/${activeOrder.orderId}`);
        const data = await response.json();
        
        if (data.deposited) {
          // Update local state with deposit confirmation
          setActiveOrder(prev => prev ? {
            ...prev,
            status: 'deposited',
            depositedAmount: data.amount,
            depositedAt: data.depositedAt,
            depositTxSignature: data.signature,
          } : null);
          
          toast({
            title: "Deposit Confirmed!",
            description: `Your deposit has been received. Payout scheduled in ${data.payoutScheduledIn} minutes.`,
          });
        }
      } catch (error) {
        console.error("Error checking deposit:", error);
      }
    };

    // Check immediately
    checkDeposit();

    // Then check every 10 seconds
    const interval = setInterval(checkDeposit, 10000);

    return () => clearInterval(interval);
  }, [activeOrder?.orderId, activeOrder?.status, toast]);

  const handleCreateOrder = () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Phantom wallet to use the mixer.",
        variant: "destructive",
      });
      return;
    }

    if (!tokenMint || !amount || !recipientAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({ tokenMint, amount, recipientAddress });
  };

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/mixer/auto-close/${orderId}`);
      return await res.json();
    },
    onSuccess: () => {
      setActiveOrder(null);
      setShowCancelDialog(false);
      toast({
        title: "Order Cancelled",
        description: "Your mixer order has been permanently cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  const handleCancelOrder = () => {
    if (!activeOrder) return;
    cancelOrderMutation.mutate(activeOrder.orderId);
  };

  const copyOrderId = () => {
    if (activeOrder) {
      navigator.clipboard.writeText(activeOrder.orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
      toast({
        title: "Copied!",
        description: "Order ID copied to clipboard",
      });
    }
  };

  // Show active order screen
  if (activeOrder) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
          {/* Main Order Card - Left Side */}
          <Card className="flex-1 p-6 sm:p-8 bg-black/40 border-primary/20">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
                MEME MIXER ORDER
              </h1>
              <p className="text-sm text-muted-foreground">
                Custodial Privacy Mixer
              </p>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-lg font-mono text-accent font-bold">{timeRemaining}</span>
              <span className="text-sm text-muted-foreground">Time Remaining</span>
            </div>

            {/* Order ID */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Order ID</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyOrderId}
                  className="h-6 gap-1"
                  data-testid="button-copy-order-id"
                >
                  {copiedOrderId ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm font-mono text-primary break-all" data-testid="text-order-id">
                {activeOrder.orderId}
              </p>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">Token Mint</Label>
                <p className="text-[10px] sm:text-xs font-mono text-foreground break-all" data-testid="text-token-mint">
                  {activeOrder.tokenMint}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">Amount</Label>
                <p className="text-xs sm:text-sm font-semibold text-foreground" data-testid="text-amount">
                  {activeOrder.amount}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">Status</Label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {activeOrder.status === 'completed' ? (
                    <>
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                      <span className="text-xs sm:text-sm font-semibold text-green-500">Completed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-semibold text-primary">Pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-muted/5 border border-border rounded-lg">
              <Label className="text-[10px] sm:text-xs text-muted-foreground mb-1">Recipient Address</Label>
              <p className="text-xs sm:text-sm font-mono text-foreground break-all" data-testid="text-recipient">
                {activeOrder.recipientAddress}
              </p>
            </div>

            {activeOrder.depositTxSignature && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Label className="text-xs text-muted-foreground mb-1">Deposit Transaction</Label>
                <p className="text-sm font-mono text-green-500 break-all" data-testid="text-deposit-signature">
                  {activeOrder.depositTxSignature}
                </p>
              </div>
            )}

            {/* Deposit Address Display */}
            {activeOrder.status === 'pending' && (
              <div className="p-4 sm:p-6 bg-primary/5 border-2 border-primary/30 rounded-lg mb-6">
                <Label className="text-xs sm:text-sm font-semibold text-primary mb-2 sm:mb-3 block">
                  Send Tokens to This Deposit Address:
                </Label>
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-background border border-border rounded-md mb-2 sm:mb-3">
                  <code className="flex-1 text-[10px] sm:text-xs font-mono text-foreground break-all" data-testid="text-deposit-address-active">
                    {activeOrder.depositAddress}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrder.depositAddress);
                      toast({ title: "Copied!", description: "Deposit address copied to clipboard" });
                    }}
                    data-testid="button-copy-deposit-active"
                    className="flex-shrink-0"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Send <strong className="text-foreground">{activeOrder.amount}</strong> tokens to this address. 
                  The mixer will automatically detect your deposit and schedule a randomized payout to the recipient.
                </p>
              </div>
            )}

            {/* Status Instructions */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Status:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {activeOrder.status === 'pending' ? (
                      <>
                        <li>Waiting for your deposit to the address above</li>
                        <li>Once detected, funds will be pooled with other users' deposits</li>
                        <li>Payout will be sent after a random delay (5-30 minutes) to break transaction links</li>
                        <li>This order expires in {timeRemaining}</li>
                      </>
                    ) : activeOrder.status === 'deposited' ? (
                      <>
                        <li>Deposit received! Funds are now in the privacy pool</li>
                        <li>Payout to recipient will occur after randomized delay</li>
                        <li>Estimated payout: {activeOrder.payoutScheduledAt ? new Date(activeOrder.payoutScheduledAt).toLocaleTimeString() : 'Shortly'}</li>
                      </>
                    ) : activeOrder.status === 'processing' ? (
                      <>
                        <li>Payout is being processed...</li>
                        <li>Your transaction will be sent to the recipient soon</li>
                      </>
                    ) : (
                      <>
                        <li>Your privacy-enhanced transfer is complete!</li>
                        <li>The transaction has been recorded on the blockchain</li>
                        <li>You can create a new order or close this one</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={() => setActiveOrder(null)}
                variant="outline"
                className="flex-1 text-sm"
                data-testid="button-new-order"
              >
                Create New Order
              </Button>
              <Button
                onClick={() => setShowCancelDialog(true)}
                variant="destructive"
                className="flex-1 text-sm"
                data-testid="button-cancel-order"
              >
                Cancel Order
              </Button>
            </div>
          </Card>

          {/* Privacy Visualization - Right Side */}
          <div className="lg:w-2/5">
            <PrivacyVisualization isActive={activeOrder?.status === 'pending'} />
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Cancel Mixer Order?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently cancel your mixer order. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Order</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelOrder}
                className="bg-destructive hover:bg-destructive/90"
              >
                Cancel Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show form for creating new order
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
        {/* Form Card - Left Side */}
        <Card className="flex-1 p-6 sm:p-8 bg-black/40 border-primary/20">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
              MEME MIXER
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Confidential SPL Token Transfers
            </p>
          </div>

          {/* Wallet Status */}
          {!walletAddress && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Wallet Required</p>
                  <p>Please connect your Phantom wallet to use the Meme Mixer.</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="tokenMint" className="text-sm font-medium text-foreground">
                Token Mint Address
              </Label>
              <Input
                id="tokenMint"
                type="text"
                placeholder="Enter SPL token mint address"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-token-mint"
              />
              <p className="text-xs text-muted-foreground">
                The Solana address of the SPL token you want to transfer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                Amount
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-amount"
              />
              <p className="text-xs text-muted-foreground">
                The amount of tokens to transfer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient" className="text-sm font-medium text-foreground">
                Recipient Address
              </Label>
              <Input
                id="recipient"
                type="text"
                placeholder="Enter recipient Solana address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-recipient"
              />
              <p className="text-xs text-muted-foreground">
                The destination wallet address for the tokens
              </p>
            </div>
          </div>

          {/* Privacy Info */}
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Privacy Features</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Custodial pool-based mixer for enhanced privacy</li>
                  <li>Backend generates unique deposit addresses</li>
                  <li>Funds pooled with other users' deposits</li>
                  <li>20-minute window to complete deposit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Create Order Button */}
          <Button
            onClick={handleCreateOrder}
            disabled={createOrderMutation.isPending || !walletAddress}
            className="w-full gap-2"
            size="lg"
            data-testid="button-create-order"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Create Anonymous Order
              </>
            )}
          </Button>
        </Card>

        {/* Privacy Visualization - Right Side */}
        <div className="lg:w-2/5">
          <PrivacyVisualization isActive={false} />
        </div>
      </div>
    </div>
  );
}
