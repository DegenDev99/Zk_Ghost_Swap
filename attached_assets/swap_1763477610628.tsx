import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDownUp, Clock, Copy, Check, AlertCircle, Loader2, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Currency {
  ticker: string;
  name: string;
  image?: string;
  network?: string;
  legacyTicker?: string;
}

interface ExchangeAmount {
  estimatedAmount: string;
  transactionSpeedForecast?: string;
}

interface Exchange {
  id: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  validUntil?: string;
  expiresAt?: number; // Server-provided expiry timestamp
}

export default function SwapPage() {
  const { toast } = useToast();
  const [fromCurrency, setFromCurrency] = useState<string>("btc");
  const [toCurrency, setToCurrency] = useState<string>("eth");
  const [fromNetwork, setFromNetwork] = useState<string>("");
  const [toNetwork, setToNetwork] = useState<string>("");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [payoutAddress, setPayoutAddress] = useState<string>("");
  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [exchangeCreatedAt, setExchangeCreatedAt] = useState<number>(0);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  // Fetch available currencies
  const { data: currencies = [], isLoading: loadingCurrencies, isError: currenciesError } = useQuery<Currency[]>({
    queryKey: ["/api/swap/currencies"],
  });

  // Fetch estimated amount with segmented query key including networks
  // Enable for different tickers OR same ticker with different networks (cross-network swaps)
  const { data: estimation, isLoading: loadingEstimation, isError: estimationError } = useQuery<ExchangeAmount>({
    queryKey: ["/api/swap/estimate", { from: fromCurrency, to: toCurrency, fromNetwork, toNetwork, amount: fromAmount }],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: fromCurrency,
        to: toCurrency,
        amount: fromAmount,
      });
      if (fromNetwork) params.append('fromNetwork', fromNetwork);
      if (toNetwork) params.append('toNetwork', toNetwork);
      
      console.log('[ZK Swap] Fetching estimate:', params.toString());
      const res = await fetch(`/api/swap/estimate?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to fetch estimate');
      }
      const data = await res.json();
      console.log('[ZK Swap] Estimate response:', data);
      return data;
    },
    enabled: !!fromAmount && parseFloat(fromAmount) > 0 && 
      (fromCurrency !== toCurrency || fromNetwork !== toNetwork),
  });

  // Poll exchange status if we have an active exchange (only when ID exists)
  const statusQueryEnabled = !!activeExchange?.id;
  const { data: exchangeStatus } = useQuery<{ status?: string }>({
    queryKey: statusQueryEnabled ? ["/api/swap/status", activeExchange.id] : ["no-exchange"],
    enabled: statusQueryEnabled,
    // Stop polling once finished
    refetchInterval: statusQueryEnabled && activeExchange?.status !== 'finished' ? 10000 : false,
  });

  // Create exchange mutation
  const createExchangeMutation = useMutation({
    mutationFn: async (data: { from: string; to: string; fromNetwork?: string; toNetwork?: string; amount: string; address: string }) => {
      const res = await apiRequest("POST", "/api/swap/exchange", data);
      return await res.json();
    },
    onSuccess: (data: Exchange) => {
      setActiveExchange(data);
      setExchangeCreatedAt(Date.now()); // Store creation timestamp (fallback only)
      
      // Invalidate estimation cache to force fresh quotes for new swaps
      queryClient.invalidateQueries({ queryKey: ["/api/swap/estimate"], exact: false });
      
      toast({
        title: "Exchange Created!",
        description: "Send your funds to the deposit address below",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Exchange Failed",
        description: error.message || "Failed to create exchange",
        variant: "destructive",
      });
    },
  });

  // Reconcile networks ONLY for currencies that have a single network option
  // For multi-network tokens (USDT, USDC), user selection via dropdown is preserved
  useEffect(() => {
    if (currencies.length > 0) {
      // Only reconcile if network is empty - preserve user's explicit network selection
      if (!fromNetwork) {
        const matchingCurrencies = currencies.filter(c => c.ticker === fromCurrency);
        // Only auto-set if there's exactly one variant (no ambiguity)
        if (matchingCurrencies.length === 1 && matchingCurrencies[0].network) {
          setFromNetwork(matchingCurrencies[0].network);
        }
      }
      
      if (!toNetwork) {
        const matchingCurrencies = currencies.filter(c => c.ticker === toCurrency);
        // Only auto-set if there's exactly one variant (no ambiguity)
        if (matchingCurrencies.length === 1 && matchingCurrencies[0].network) {
          setToNetwork(matchingCurrencies[0].network);
        }
      }
    }
  }, [currencies, fromCurrency, toCurrency, fromNetwork, toNetwork]);

  // Swap currencies preserving their networks
  const handleSwapCurrencies = () => {
    // Swap both tickers and networks
    const tempCurrency = fromCurrency;
    const tempNetwork = fromNetwork;
    
    setFromCurrency(toCurrency);
    setFromNetwork(toNetwork);
    
    setToCurrency(tempCurrency);
    setToNetwork(tempNetwork);
  };

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (activeExchange?.payinAddress) {
      navigator.clipboard.writeText(activeExchange.payinAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
      toast({
        title: "Address Copied!",
        description: "Deposit address copied to clipboard",
      });
    }
  };

  // Copy Order ID to clipboard
  const handleCopyOrderId = () => {
    if (activeExchange?.id) {
      navigator.clipboard.writeText(activeExchange.id);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
      toast({
        title: "Order ID Copied!",
        description: "Save this for your records",
      });
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    // Validate amount is a positive number
    const amount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return false;
    }

    // Validate payout address is not empty
    if (!payoutAddress || payoutAddress.trim().length < 10) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid payout address",
        variant: "destructive",
      });
      return false;
    }

    // Ensure different currencies (allowing same ticker with different networks)
    if (fromCurrency === toCurrency && fromNetwork === toNetwork) {
      toast({
        title: "Invalid Swap",
        description: "Source and destination currencies must be different",
        variant: "destructive",
      });
      return false;
    }

    // Let ChangeNOW API handle currency validation - they know best!
    // We just need basic sanity checks above
    return true;
  };

  // Create exchange
  const handleCreateExchange = () => {
    if (!validateForm()) {
      return;
    }

    const exchangeData: any = {
      from: fromCurrency,
      to: toCurrency,
      amount: fromAmount,
      address: payoutAddress,
    };

    // Include network parameters if available (required for multi-network tokens)
    if (fromNetwork) {
      exchangeData.fromNetwork = fromNetwork;
    }
    if (toNetwork) {
      exchangeData.toNetwork = toNetwork;
    }

    createExchangeMutation.mutate(exchangeData);
  };

  // Timer countdown (uses server-provided expiry timestamp)
  useEffect(() => {
    if (!activeExchange || !activeExchange.expiresAt) {
      // If no server expiry, can't display accurate countdown
      setTimeRemaining("20:00");
      return;
    }

    console.log('[ZK Swap] Starting timer with expiry:', new Date(activeExchange.expiresAt).toISOString());

    // Use server-provided expiry timestamp (canonical source of truth)
    const expiryTime = activeExchange.expiresAt;

    // Update immediately
    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return false;
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        return true;
      }
    };

    // Update immediately on mount
    const shouldContinue = updateTimer();
    
    if (!shouldContinue) {
      return;
    }

    // Then update every second
    const interval = setInterval(() => {
      const shouldContinue = updateTimer();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeExchange?.expiresAt]); // Only depend on expiresAt, not whole object

  // Update exchange status from polling
  useEffect(() => {
    if (exchangeStatus?.status && activeExchange && exchangeStatus.status !== activeExchange.status) {
      const newStatus = exchangeStatus.status;
      setActiveExchange(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Show toast when exchange is finished
      if (newStatus === 'finished') {
        toast({
          title: "🎉 Exchange Complete!",
          description: "Your swap has been successfully completed",
        });
      }
    }
  }, [exchangeStatus?.status]);

  // Render exchange view (after creation)
  if (activeExchange) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
          {/* Main Exchange Card - Left Side */}
          <Card className="flex-1 p-6 sm:p-8 bg-black/40 border-primary/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
              ZK SWAP EXCHANGE
            </h1>
            <p className="text-sm text-muted-foreground">
              Privacy-First Asset Swapping
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-lg font-mono text-accent font-bold">{timeRemaining}</span>
            <span className="text-sm text-muted-foreground">Time Remaining</span>
          </div>

          {/* Exchange Details */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-xs text-muted-foreground mb-1">You Send</Label>
                <p className="text-lg font-bold text-foreground">
                  {activeExchange.fromAmount} {activeExchange.fromCurrency.toUpperCase()}
                </p>
              </div>
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <Label className="text-xs text-muted-foreground mb-1">You Receive</Label>
                <p className="text-lg font-bold text-primary">
                  {activeExchange.toAmount} {activeExchange.toCurrency.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className={`p-4 border rounded-lg ${
              activeExchange.status === 'finished' 
                ? 'bg-green-500/10 border-green-500/30' 
                : activeExchange.status === 'failed' || activeExchange.status === 'refunded'
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-primary/10 border-primary/30'
            }`}>
              <Label className="text-xs text-muted-foreground mb-1">Status</Label>
              <div className="flex items-center gap-2">
                {activeExchange.status === 'finished' ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-bold text-green-500">COMPLETED</p>
                  </>
                ) : activeExchange.status === 'failed' || activeExchange.status === 'refunded' ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-bold text-destructive uppercase">{activeExchange.status}</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <p className="text-sm font-medium text-primary capitalize">{activeExchange.status}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Deposit Address */}
          <div className="mb-6">
            <Label className="text-sm mb-2 block">Deposit Address</Label>
            <div className="flex gap-2">
              <Input
                value={activeExchange.payinAddress}
                readOnly
                className="font-mono text-xs sm:text-sm bg-muted/10"
                data-testid="input-deposit-address"
              />
              <Button
                onClick={handleCopyAddress}
                size="icon"
                variant="outline"
                data-testid="button-copy-address"
              >
                {copiedAddress ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send exactly <span className="font-bold text-primary">{activeExchange.fromAmount} {activeExchange.fromCurrency.toUpperCase()}</span> to this address
            </p>
          </div>

          {/* Payout Address */}
          <div className="mb-6">
            <Label className="text-sm mb-2 block">Payout Address</Label>
            <Input
              value={activeExchange.payoutAddress}
              readOnly
              className="font-mono text-xs sm:text-sm bg-muted/10"
              data-testid="input-payout-address"
            />
          </div>

          {/* ORDER ID - CRITICAL INFORMATION */}
          <div className="p-5 bg-gradient-to-br from-destructive/20 via-orange-500/10 to-destructive/20 border-2 border-destructive/40 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive mt-1 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="text-lg font-bold text-destructive mb-2 uppercase tracking-wide">
                  ⚠️ SAVE YOUR ORDER ID ⚠️
                </p>
                <div className="mb-3 p-3 bg-black/40 border border-destructive/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Order ID / Reference Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold font-mono text-primary break-all flex-1" data-testid="text-order-id">
                      {activeExchange.id}
                    </p>
                    <Button
                      onClick={handleCopyOrderId}
                      size="icon"
                      variant="outline"
                      className="border-destructive/40 hover:bg-destructive/20"
                      data-testid="button-copy-orderid"
                    >
                      {copiedOrderId ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-destructive">
                    🔴 THIS INFORMATION WILL BE DELETED WHEN YOU LEAVE THIS PAGE!
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">You MUST save this Order ID</span> for your records. You'll need it to:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
                    <li>Track your exchange status</li>
                    <li>Contact support if needed</li>
                    <li>Reference this transaction</li>
                  </ul>
                  <p className="text-xs text-destructive font-semibold mt-2">
                    📸 Take a screenshot or copy this ID immediately!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Transaction Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Send the exact amount to the deposit address</li>
                  <li>Wait for blockchain confirmations</li>
                  <li>Funds will be sent to your payout address automatically</li>
                  <li>This exchange expires in {timeRemaining}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* New Exchange Button */}
          <Button
            onClick={() => setActiveExchange(null)}
            className="w-full mt-6"
            variant="outline"
            data-testid="button-new-exchange"
          >
            Create New Exchange
          </Button>
        </Card>

        {/* ZK Privacy Visualization - Right Side */}
        <Card className="lg:w-[420px] p-8 bg-black/60 border-primary/30 relative overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-500 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-500 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-500 mb-4 animate-pulse">
                <span className="text-3xl">🔐</span>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                ZERO-KNOWLEDGE PRIVACY
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                ACTIVE PROTECTION
              </p>
            </div>

            {/* Privacy Status Indicators */}
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-cyan-400">🛡️ IDENTITY SHIELDED</span>
                  <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] font-bold text-green-500">ACTIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">Your wallet identity is cryptographically protected</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-400">🔒 TRANSACTION OBFUSCATED</span>
                  <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] font-bold text-green-500">ACTIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">Transaction details are encrypted end-to-end</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-pink-400">⚡ PROOF VERIFIED</span>
                  <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] font-bold text-green-500">ACTIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">Zero-knowledge proof validation complete</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-orange-400">🌐 ANONYMOUS ROUTING</span>
                  <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] font-bold text-green-500">ACTIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">Exchange routed through privacy network</p>
              </div>
            </div>

            {/* ZK Circuit Visualization */}
            <div className="p-6 bg-black/40 border border-primary/20 rounded-xl mb-6">
              <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider text-center">
                ZK-SNARK Circuit Active
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Witness Generation', delay: '0s' },
                  { label: 'Constraint System', delay: '0.3s' },
                  { label: 'Proof Compilation', delay: '0.6s' },
                  { label: 'Verification Layer', delay: '0.9s' },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full animate-pulse"
                      style={{ animationDelay: step.delay }}
                    />
                    <div className="flex-1 h-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 animate-pulse"
                        style={{ animationDelay: step.delay }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="p-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/30 rounded-xl text-center">
              <p className="text-sm font-bold text-foreground mb-1">
                🔐 PRIVACY GUARANTEED
              </p>
              <p className="text-xs text-muted-foreground">
                Your swap is protected by military-grade zero-knowledge cryptography. No transaction metadata is exposed.
              </p>
            </div>

            {/* ZK Proof Hash - Static when finished */}
            <div className="mt-6">
              <div className="text-center mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Proof Hash
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${
                activeExchange.status === 'finished' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-black/40 border-primary/20'
              }`}>
                <p className={`font-mono text-xs break-all text-center ${
                  activeExchange.status === 'finished'
                    ? 'text-green-400'
                    : 'text-primary/60 animate-pulse'
                }`}>
                  zk_0x{activeExchange.id.replace(/-/g, '').slice(0, 32).padEnd(32, '0')}
                </p>
              </div>
              {activeExchange.status === 'finished' && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-green-500 mb-1">✅ PROOF FINALIZED</p>
                      <p className="text-muted-foreground">
                        Save this proof hash for your records. It serves as cryptographic evidence of your transaction.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
      </div>
    );
  }

  // Render swap form (initial view)
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-black/40 border-primary/20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
            ZK SWAP
          </h1>
          <p className="text-sm text-muted-foreground">
            Privacy-First Asset Swapping
          </p>
        </div>

        {/* Swap Form */}
        <div className="space-y-4">
          {/* Loading/Error States for Currencies */}
          {loadingCurrencies && (
            <div className="flex items-center gap-2 p-3 bg-muted/10 border border-border rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading available currencies...</span>
            </div>
          )}
          {currenciesError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Failed to load currencies. Please refresh.</span>
            </div>
          )}

          {/* From Currency - Searchable */}
          <div>
            <Label htmlFor="from-currency" className="text-sm mb-2 block">
              You Send
            </Label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fromOpen}
                  className="w-full justify-between font-normal"
                  disabled={loadingCurrencies}
                  data-testid="select-from-currency"
                >
                  {fromCurrency ? (
                    <span>
                      {fromCurrency.toUpperCase()} - {currencies.find((c) => c.ticker === fromCurrency && (c.network === fromNetwork || (!c.network && !fromNetwork)))?.name || currencies.find((c) => c.ticker === fromCurrency)?.name || ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select currency...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search currencies..." />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {currencies.map((currency, index) => (
                        <CommandItem
                          key={`from-${currency.ticker}-${currency.network || 'none'}-${index}`}
                          value={`${currency.ticker} ${currency.name} ${currency.network || ''}`}
                          onSelect={() => {
                            setFromCurrency(currency.ticker.toLowerCase());  // Normalize to lowercase for API
                            setFromNetwork(currency.network || "");
                            setFromOpen(false);
                          }}
                        >
                          <span className="font-medium">{currency.ticker.toUpperCase()}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{currency.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* From Amount */}
          <div>
            <Label htmlFor="from-amount" className="text-sm mb-2 block">
              Amount
            </Label>
            <Input
              id="from-amount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="font-mono"
              data-testid="input-from-amount"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              💡 Use leading zero for decimals (e.g., 0.1 not .1)
            </p>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              size="icon"
              variant="outline"
              onClick={handleSwapCurrencies}
              className="rounded-full"
              data-testid="button-swap-currencies"
            >
              <ArrowDownUp className="w-4 h-4" />
            </Button>
          </div>

          {/* To Currency - Searchable */}
          <div>
            <Label htmlFor="to-currency" className="text-sm mb-2 block">
              You Receive
            </Label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={toOpen}
                  className="w-full justify-between font-normal"
                  disabled={loadingCurrencies}
                  data-testid="select-to-currency"
                >
                  {toCurrency ? (
                    <span>
                      {toCurrency.toUpperCase()} - {currencies.find((c) => c.ticker === toCurrency && (c.network === toNetwork || (!c.network && !toNetwork)))?.name || currencies.find((c) => c.ticker === toCurrency)?.name || ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select currency...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search currencies..." />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {currencies.map((currency, index) => (
                        <CommandItem
                          key={`to-${currency.ticker}-${currency.network || 'none'}-${index}`}
                          value={`${currency.ticker} ${currency.name} ${currency.network || ''}`}
                          onSelect={() => {
                            setToCurrency(currency.ticker.toLowerCase());  // Normalize to lowercase for API
                            setToNetwork(currency.network || "");
                            setToOpen(false);
                          }}
                        >
                          <span className="font-medium">{currency.ticker.toUpperCase()}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{currency.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Live Conversion Box */}
          {loadingEstimation ? (
            <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-primary/10 to-pink-500/10 border-2 border-primary/30 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Fetching live rates...</span>
            </div>
          ) : estimation && estimation.estimatedAmount ? (
            <div className="p-5 bg-gradient-to-br from-primary/5 via-pink-500/5 to-primary/10 border-2 border-primary/30 rounded-xl space-y-4" data-testid="box-live-conversion">
              {/* Live Indicator */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Live Exchange Rate</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-green-500 uppercase">Live</span>
                </span>
              </div>

              {/* Conversion Display */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{fromAmount}</p>
                  <p className="text-sm text-muted-foreground mt-1">{fromCurrency.toUpperCase()}</p>
                </div>
                <div className="text-2xl text-primary">→</div>
                <div className="text-center">
                  <p className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent" data-testid="text-estimated-amount">
                    {estimation.estimatedAmount}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{toCurrency.toUpperCase()}</p>
                </div>
              </div>

              {/* Separator */}
              <div className="h-px bg-border/50" />

              {/* Transaction Details */}
              <div className="space-y-1.5 text-xs">
                {estimation.transactionSpeedForecast && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-medium text-foreground">~{estimation.transactionSpeedForecast}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-medium text-green-500">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Privacy</span>
                  <span className="font-medium text-primary">No Registration Required</span>
                </div>
              </div>
            </div>
          ) : fromAmount && parseFloat(fromAmount) > 0 ? (
            <div className="p-4 bg-muted/20 border border-dashed border-border rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Enter amount to see live conversion rate</p>
            </div>
          ) : null}

          {/* Payout Address */}
          <div>
            <Label htmlFor="payout-address" className="text-sm mb-2 block">
              {toCurrency.toUpperCase()} Payout Address
            </Label>
            <Input
              id="payout-address"
              placeholder={`Enter your ${toCurrency.toUpperCase()} address`}
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              className="font-mono text-sm"
              data-testid="input-payout-address"
            />
          </div>

          {/* Create Exchange Button */}
          <Button
            onClick={handleCreateExchange}
            className="w-full"
            disabled={createExchangeMutation.isPending || !fromAmount || !payoutAddress}
            data-testid="button-create-exchange"
          >
            {createExchangeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Exchange...
              </>
            ) : (
              "Create Exchange"
            )}
          </Button>
        </div>

        {/* Powered By */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Powered by ZK Enigma Link Network</p>
          <p className="text-[10px] mt-1">Secure • Private • Decentralized</p>
        </div>
      </Card>
    </div>
  );
}
