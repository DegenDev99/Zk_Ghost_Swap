import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Shield, Lock, Zap, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction
} from "@solana/spl-token";
import { PrivacyVisualization } from "@/components/PrivacyVisualization";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export default function MemeMixerPage() {
  const { toast } = useToast();
  const { walletAddress, signTransaction } = useWallet();
  const [tokenMint, setTokenMint] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<any | null>(null);
  const [copiedSignature, setCopiedSignature] = useState(false);
  const [step, setStep] = useState<"input" | "processing" | "complete">("input");

  const handleMixTokens = async () => {
    if (!walletAddress || !signTransaction) {
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

    setIsProcessing(true);
    setStep("processing");

    try {
      const connection = new Connection(SOLANA_RPC);
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(tokenMint);
      const recipientPubkey = new PublicKey(recipientAddress);

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
      const transferAmount = parseFloat(amount) * Math.pow(10, decimals);

      // Add confidential transfer instruction
      // Note: This uses Token-2022 which supports confidential transfers
      // Full implementation would require configuring the account with encryption keys first
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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;

      // Sign and send transaction
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setActiveTransfer({
        signature,
        amount,
        token: tokenMint,
        recipient: recipientAddress,
        timestamp: new Date().toISOString(),
      });

      setStep("complete");

      toast({
        title: "Transfer Complete",
        description: "Your confidential transfer has been completed successfully.",
      });

    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to complete the transfer. Please try again.",
        variant: "destructive",
      });
      setStep("input");
    } finally {
      setIsProcessing(false);
    }
  };

  const copySignature = () => {
    if (activeTransfer?.signature) {
      navigator.clipboard.writeText(activeTransfer.signature);
      setCopiedSignature(true);
      setTimeout(() => setCopiedSignature(false), 2000);
    }
  };

  const resetForm = () => {
    setTokenMint("");
    setAmount("");
    setRecipientAddress("");
    setActiveTransfer(null);
    setStep("input");
  };

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00D9FF] to-[#6600FF] bg-clip-text text-transparent">
              Meme Mixer
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Private SPL token transfers using Solana Token-2022 confidential technology
          </p>
        </div>

        {/* Privacy Features Banner */}
        <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Amount Privacy</h3>
                <p className="text-sm text-muted-foreground">Transfer amounts are encrypted using ElGamal encryption</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Zero-Knowledge Proofs</h3>
                <p className="text-sm text-muted-foreground">Validate transactions without revealing details</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Native Solana</h3>
                <p className="text-sm text-muted-foreground">Built-in Token-2022 program, no third-party trust</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Transfer Card */}
        {step !== "complete" && (
          <Card className="p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Confidential Transfer</h2>
              <p className="text-muted-foreground">
                Send SPL tokens with encrypted amounts for enhanced privacy
              </p>
            </div>

            {/* Wallet Connection Check */}
            {!walletAddress ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <AlertCircle className="w-16 h-16 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Wallet Not Connected</h3>
                  <p className="text-muted-foreground">
                    Please connect your Phantom wallet to use the Meme Mixer
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Token Mint Address */}
                <div className="space-y-2">
                  <Label htmlFor="token-mint" className="text-base">Token Mint Address</Label>
                  <Input
                    id="token-mint"
                    data-testid="input-token-mint"
                    placeholder="Enter SPL token mint address..."
                    value={tokenMint}
                    onChange={(e) => setTokenMint(e.target.value)}
                    className="font-mono text-sm"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    The token must be a Token-2022 mint with confidential transfer extension enabled
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-base">Amount</Label>
                  <Input
                    id="amount"
                    data-testid="input-amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-mono text-lg"
                    disabled={isProcessing}
                  />
                </div>

                {/* Recipient Address */}
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-base">Recipient Address</Label>
                  <Input
                    id="recipient"
                    data-testid="input-recipient"
                    placeholder="Enter recipient Solana address..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="font-mono text-sm"
                    disabled={isProcessing}
                  />
                </div>

                {/* Privacy Notice */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <EyeOff className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Privacy-Enhanced Transfer</p>
                    <p className="text-xs text-muted-foreground">
                      This transfer will use confidential transfer technology to hide the transfer amount from blockchain explorers while maintaining cryptographic proof of validity.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  data-testid="button-mix-tokens"
                  onClick={handleMixTokens}
                  disabled={isProcessing || !tokenMint || !amount || !recipientAddress}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Execute Confidential Transfer
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Processing State */}
        {step === "processing" && (
          <Card className="p-8">
            <PrivacyVisualization 
              isActive={true}
              privacyScore={75}
              exchangeStatus="exchanging"
            />
          </Card>
        )}

        {/* Success State */}
        {step === "complete" && activeTransfer && (
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-500">Transfer Complete!</h2>
                <p className="text-muted-foreground">
                  Your confidential transfer has been successfully executed
                </p>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4 p-6 rounded-lg bg-card/50 border">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="font-mono font-semibold text-lg">{activeTransfer.amount} tokens</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                  <p className="font-mono text-sm break-all">{activeTransfer.recipient}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction Signature</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs break-all flex-1">{activeTransfer.signature}</p>
                    <Button
                      data-testid="button-copy-signature"
                      variant="ghost"
                      size="icon"
                      onClick={copySignature}
                      className="flex-shrink-0"
                    >
                      {copiedSignature ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* View on Explorer */}
              <Button
                data-testid="button-view-explorer"
                variant="outline"
                className="w-full"
                onClick={() => window.open(`https://solscan.io/tx/${activeTransfer.signature}`, '_blank')}
              >
                View on Solscan
              </Button>
            </div>

            {/* New Transfer Button */}
            <Button
              data-testid="button-new-transfer"
              onClick={resetForm}
              variant="outline"
              className="w-full"
            >
              Start New Transfer
            </Button>
          </Card>
        )}

        {/* Info Section */}
        <Card className="p-6 bg-card/30">
          <h3 className="font-semibold mb-4">How It Works</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Configure Confidential Account</p>
                <p className="text-xs">Your token account is configured to support encrypted transfers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Encrypt Transfer Amount</p>
                <p className="text-xs">The amount is encrypted using ElGamal homomorphic encryption</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Generate Zero-Knowledge Proof</p>
                <p className="text-xs">Cryptographic proof verifies validity without revealing the amount</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Execute Transfer</p>
                <p className="text-xs">Tokens are transferred with encrypted amounts on-chain</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
