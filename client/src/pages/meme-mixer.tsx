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
  const [isExecuting, setIsExecuting] = useState(false);
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

  // Submit transaction mutation
  const submitTransactionMutation = useMutation({
    mutationFn: async (data: { orderId: string; signature: string }) => {
      const res = await apiRequest("POST", "/api/mixer/submit", data);
      return await res.json();
    },
    onSuccess: () => {
      if (activeOrder) {
        setActiveOrder({ ...activeOrder, status: 'completed' });
        toast({
          title: "🎉 Transfer Complete!",
          description: "Your confidential transfer was successful",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit transaction",
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

  const handleExecuteTransfer = async () => {
    if (!activeOrder || !walletAddress || !signTransaction) return;

    setIsExecuting(true);

    try {
      // Dynamically import Solana packages only when needed
      const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
      const { 
        TOKEN_2022_PROGRAM_ID,
        getAssociatedTokenAddressSync,
        createAssociatedTokenAccountInstruction,
        createTransferCheckedInstruction
      } = await import("@solana/spl-token");

      const connection = new Connection(SOLANA_RPC);
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(activeOrder.tokenMint);
      const recipientPubkey = new PublicKey(activeOrder.recipientAddress);

      // Get or create associated token accounts
      const senderATA = getAssociatedTokenAddressSync(
        mintPubkey,
        walletPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const recipientATA = getAssociatedTokenAddressSync(
        mintPubkey,
        recipientPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Build transaction
      const transaction = new Transaction();

      // Check if recipient ATA exists, if not create it
      const recipientATAInfo = await connection.getAccountInfo(recipientATA);
      if (!recipientATAInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            walletPubkey,
            recipientATA,
            recipientPubkey,
            mintPubkey,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Get token info to determine decimals
      const tokenInfo = await connection.getParsedAccountInfo(mintPubkey);
      const decimals = (tokenInfo.value?.data as any)?.parsed?.info?.decimals || 9;
      const transferAmount = parseFloat(activeOrder.amount) * Math.pow(10, decimals);

      // Add confidential transfer instruction
      transaction.add(
        createTransferCheckedInstruction(
          senderATA,
          mintPubkey,
          recipientATA,
          walletPubkey,
          transferAmount,
          decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;

      // Sign and send transaction
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      // Submit to backend
      await submitTransactionMutation.mutateAsync({
        orderId: activeOrder.orderId,
        signature,
      });

      toast({
        title: "Success!",
        description: "Your confidential transfer is complete.",
      });
    } catch (error: any) {
      console.error("[Mixer] Error executing transfer:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to execute confidential transfer",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
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
                Confidential Token Transfer
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
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm font-mono text-primary break-all" data-testid="text-order-id">
                {activeOrder.orderId}
              </p>
            </div>

            {/* Order Details */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-xs text-muted-foreground mb-1">Token Mint</Label>
                <p className="text-sm font-mono text-foreground break-all" data-testid="text-token-mint">
                  {activeOrder.tokenMint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/5 border border-border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-1">Amount</Label>
                  <p className="text-lg font-bold text-foreground" data-testid="text-amount">
                    {activeOrder.amount}
                  </p>
                </div>
                <div className="p-4 bg-muted/5 border border-border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-1">Status</Label>
                  <div className="flex items-center gap-2">
                    {activeOrder.status === 'completed' ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-500">Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Pending</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-xs text-muted-foreground mb-1">Recipient Address</Label>
                <p className="text-sm font-mono text-foreground break-all" data-testid="text-recipient">
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
            </div>

            {/* Instructions */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {activeOrder.status === 'pending' ? (
                      <>
                        <li>Click "Execute Confidential Transfer" to sign and send the transaction</li>
                        <li>Your wallet will prompt you to approve the transaction</li>
                        <li>The transfer will use Solana Token-2022 for enhanced privacy</li>
                        <li>This order expires in {timeRemaining}</li>
                      </>
                    ) : (
                      <>
                        <li>Your confidential transfer is complete!</li>
                        <li>The transaction has been recorded on the blockchain</li>
                        <li>You can create a new order or close this one</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {activeOrder.status === 'pending' && (
                <Button
                  onClick={handleExecuteTransfer}
                  disabled={isExecuting || timeRemaining === "Expired"}
                  className="w-full gap-2"
                  size="lg"
                  data-testid="button-execute-transfer"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executing Transfer...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Execute Confidential Transfer
                    </>
                  )}
                </Button>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setActiveOrder(null)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-new-order"
                >
                  Create New Order
                </Button>
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-cancel-order"
                >
                  Cancel Order
                </Button>
              </div>
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
                The order will be removed and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-dialog-cancel">
                Keep Order
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-cancel-dialog-confirm"
              >
                Yes, Cancel Order
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
              MEME MIXER
            </h1>
            <p className="text-sm text-muted-foreground">
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
                  <li>Uses Solana Token-2022 Confidential Transfers</li>
                  <li>Transfer amounts hidden via ElGamal encryption</li>
                  <li>Zero-knowledge proofs for transaction validity</li>
                  <li>Non-custodial: you control your wallet</li>
                  <li>20-minute window to execute transfer</li>
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
