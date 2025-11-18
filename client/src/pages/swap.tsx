import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDownUp, Clock, Copy, Check, AlertCircle, Loader2, ChevronsUpDown, Shield, Lock, Zap, Globe, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Currency, ExchangeAmount, Exchange } from "@shared/schema";
import { PrivacyVisualization } from "@/components/PrivacyVisualization";
import { useWallet } from "@/contexts/WalletContext";
import { getOrCreateSessionId } from "@/lib/session";
import { Link } from "wouter";

export default function SwapPage() {
  const { toast } = useToast();
  const { walletAddress } = useWallet();
  const [fromCurrency, setFromCurrency] = useState<string>("btc");
  const [toCurrency, setToCurrency] = useState<string>("eth");
  const [fromNetwork, setFromNetwork] = useState<string>("");
  const [toNetwork, setToNetwork] = useState<string>("");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [payoutAddress, setPayoutAddress] = useState<string>("");
  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const sessionId = getOrCreateSessionId();

  // Centralized function to clear active exchange
  const clearActiveExchange = () => {
    setManuallyDismissed(true);
    setActiveExchange(null);
  };

  // Fetch available currencies
  const { data: currencies = [], isLoading: loadingCurrencies, isError: currenciesError } = useQuery<Currency[]>({
    queryKey: ["/api/swap/currencies"],
  });

  // Fetch estimated amount
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
      
      const res = await fetch(`/api/swap/estimate?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to fetch estimate');
      }
      return await res.json();
    },
    enabled: !!fromAmount && fromAmount.trim() !== '' && parseFloat(fromAmount) > 0 && 
      (fromCurrency !== toCurrency || fromNetwork !== toNetwork),
  });

  // Poll exchange status
  const statusQueryEnabled = !!activeExchange?.id;
  const { data: exchangeStatus, isError: statusError, refetch: refetchStatus } = useQuery<{ status?: string }>({
    queryKey: statusQueryEnabled ? ["/api/swap/status", activeExchange.id] : ["no-exchange"],
    queryFn: async ({ queryKey }) => {
      const exchangeId = queryKey[1] as string;
      if (!exchangeId) {
        throw new Error("No exchange ID");
      }
      const res = await fetch(`/api/swap/status/${exchangeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch exchange status");
      }
      return await res.json();
    },
    enabled: statusQueryEnabled,
    refetchInterval: statusQueryEnabled && activeExchange?.status !== 'finished' ? 10000 : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(2000 * (attemptIndex + 1), 10000),
  });

  // Check for active order on mount and when activeExchange becomes null
  const activeOrderQuery = useQuery<Exchange | null>({
    queryKey: ["/api/swap/active-order", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/swap/active-order?sessionId=${sessionId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data) {
        setManuallyDismissed(false);
        setActiveExchange(data);
      }
      return data;
    },
    enabled: !!sessionId,
  });

  // Refetch when activeExchange is cleared (but not if manually dismissed)
  // Use a ref to track previous activeExchange to avoid refetch loops
  const prevActiveExchange = useRef<Exchange | null>(null);
  useEffect(() => {
    // Only refetch if we just transitioned from having an exchange to not having one
    if (prevActiveExchange.current && !activeExchange && sessionId && !manuallyDismissed) {
      activeOrderQuery.refetch();
    }
    prevActiveExchange.current = activeExchange;
  }, [activeExchange, sessionId, manuallyDismissed]);

  // Create exchange mutation
  const createExchangeMutation = useMutation({
    mutationFn: async (data: { from: string; to: string; fromNetwork?: string; toNetwork?: string; amount: string; address: string }) => {
      const payload = {
        ...data,
        sessionId,
        walletAddress: walletAddress || undefined,
      };
      const res = await apiRequest("POST", "/api/swap/exchange", payload);
      return await res.json();
    },
    onSuccess: (data: Exchange) => {
      setManuallyDismissed(false);
      setActiveExchange(data);
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

  // Reconcile networks
  useEffect(() => {
    if (currencies.length > 0) {
      if (!fromNetwork) {
        const matchingCurrencies = currencies.filter(c => c.ticker === fromCurrency);
        if (matchingCurrencies.length === 1 && matchingCurrencies[0].network) {
          setFromNetwork(matchingCurrencies[0].network);
        }
      }
      
      if (!toNetwork) {
        const matchingCurrencies = currencies.filter(c => c.ticker === toCurrency);
        if (matchingCurrencies.length === 1 && matchingCurrencies[0].network) {
          setToNetwork(matchingCurrencies[0].network);
        }
      }
    }
  }, [currencies, fromCurrency, toCurrency, fromNetwork, toNetwork]);

  // Swap currencies
  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    const tempNetwork = fromNetwork;
    
    setFromCurrency(toCurrency);
    setFromNetwork(toNetwork);
    
    setToCurrency(tempCurrency);
    setToNetwork(tempNetwork);
  };

  // Copy address
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

  // Copy Order ID
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

  // Validation
  const validateForm = (): boolean => {
    const amount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return false;
    }

    if (!payoutAddress || payoutAddress.trim().length < 10) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid payout address",
        variant: "destructive",
      });
      return false;
    }

    if (fromCurrency === toCurrency && fromNetwork === toNetwork) {
      toast({
        title: "Invalid Swap",
        description: "Source and destination currencies must be different",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Create exchange
  const handleCreateExchange = () => {
    if (!validateForm()) return;

    const exchangeData: any = {
      from: fromCurrency,
      to: toCurrency,
      amount: fromAmount,
      address: payoutAddress,
    };

    if (fromNetwork) exchangeData.fromNetwork = fromNetwork;
    if (toNetwork) exchangeData.toNetwork = toNetwork;

    createExchangeMutation.mutate(exchangeData);
  };

  // Timer countdown
  useEffect(() => {
    if (!activeExchange || !activeExchange.expiresAt) {
      setTimeRemaining("20:00");
      return;
    }

    const expiryTime = activeExchange.expiresAt;

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

    const shouldContinue = updateTimer();
    if (!shouldContinue) return;

    const interval = setInterval(() => {
      const shouldContinue = updateTimer();
      if (!shouldContinue) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeExchange?.expiresAt]);

  // Update exchange status from polling
  useEffect(() => {
    if (exchangeStatus?.status && activeExchange && exchangeStatus.status !== activeExchange.status) {
      const newStatus = exchangeStatus.status;
      setActiveExchange(prev => prev ? { ...prev, status: newStatus } : null);
      
      if (newStatus === 'finished') {
        toast({
          title: "Exchange Complete!",
          description: "Your swap has been successfully completed",
        });
      }
    }
  }, [exchangeStatus?.status]);

  // Auto-close completed orders after 10 minutes
  useEffect(() => {
    if (activeExchange?.status === 'finished') {
      const autoCloseTimer = setTimeout(async () => {
        // Mark as auto-closed in the backend
        try {
          await apiRequest("POST", `/api/swap/auto-close/${activeExchange.id}`, {});
        } catch (error) {
          console.error("Failed to mark order as auto-closed:", error);
        }
        
        // Clear the active exchange
        clearActiveExchange();
        
        toast({
          title: "Order Closed",
          description: "Completed order has been archived. Order ID saved to history.",
        });
      }, 10 * 60 * 1000); // 10 minutes

      return () => clearTimeout(autoCloseTimer);
    }
  }, [activeExchange?.status, activeExchange?.id]);

  // Handle status polling errors
  useEffect(() => {
    if (statusError && activeExchange) {
      toast({
        title: "Status Update Failed",
        description: "Having trouble checking exchange status. Will retry automatically.",
        variant: "destructive",
      });
    }
  }, [statusError, activeExchange]);

  // Render exchange view
  if (activeExchange) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Matrix Background Effect */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
            backgroundSize: '100% 4px'
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
            backgroundSize: '4px 100%'
          }} />
        </div>

        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 relative z-10">
          {/* Main Exchange Card */}
          <Card className="flex-1 p-6 sm:p-8 bg-card/40 backdrop-blur-sm border-primary/20">
            {/* Home Button */}
            <div className="flex justify-start mb-6">
              <Link href="/">
                <Button
                  variant="outline"
                  className="gap-2 text-base font-semibold border-2"
                  onClick={clearActiveExchange}
                  data-testid="button-home"
                >
                  <Home className="w-5 h-5" />
                  Home
                </Button>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
                ZK SWAP EXCHANGE
              </h1>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Privacy-First Asset Swapping
              </p>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-accent/10 border border-accent/30 rounded-md">
              <Clock className="w-5 h-5 text-accent" />
              <span className={`text-xl font-mono font-bold ${timeRemaining === 'Expired' ? 'text-destructive' : 'text-accent'}`} data-testid="text-timer">
                {timeRemaining}
              </span>
              <span className="text-sm text-muted-foreground">Time Remaining</span>
            </div>

            {/* Status Polling Error Banner */}
            {statusError && (
              <div className="mb-6 p-4 bg-destructive/10 border-2 border-destructive/40 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-destructive mb-1">Status Update Error</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unable to fetch exchange status. Your transaction is still processing, but we can't display real-time updates.
                    </p>
                    <Button
                      onClick={() => refetchStatus()}
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover-elevate"
                      data-testid="button-retry-status"
                    >
                      Retry Status Check
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Exchange Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/5 border border-border rounded-md">
                  <Label className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">You Send</Label>
                  <p className="text-lg font-bold font-mono text-foreground" data-testid="text-exchange-from-amount">
                    {activeExchange.fromAmount} {activeExchange.fromCurrency.toUpperCase()}
                  </p>
                </div>
                <div className="p-4 bg-muted/5 border border-primary/20 rounded-md">
                  <Label className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">You Receive</Label>
                  <p className="text-lg font-bold font-mono text-primary" data-testid="text-exchange-to-amount">
                    {activeExchange.toAmount} {activeExchange.toCurrency.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className={`p-4 border rounded-md ${
                activeExchange.status === 'finished' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : activeExchange.status === 'failed' || activeExchange.status === 'refunded'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-primary/10 border-primary/30'
              }`} data-testid="box-exchange-status">
                <Label className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Status</Label>
                <div className="flex items-center gap-2" data-testid="text-exchange-status">
                  {activeExchange.status === 'finished' ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <p className="text-sm font-bold font-mono text-green-500 uppercase">COMPLETED</p>
                    </>
                  ) : activeExchange.status === 'failed' || activeExchange.status === 'refunded' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <p className="text-sm font-bold font-mono text-destructive uppercase">{activeExchange.status}</p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <p className="text-sm font-medium font-mono text-primary capitalize">{activeExchange.status}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Deposit Address */}
            <div className="mb-6">
              <Label className="text-sm mb-2 block uppercase tracking-wider">Deposit Address</Label>
              <div className="flex gap-2">
                <Input
                  value={activeExchange.payinAddress}
                  readOnly
                  className="font-mono text-xs sm:text-sm bg-muted/10 border-primary/20"
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
                Send exactly <span className="font-bold font-mono text-primary">{activeExchange.fromAmount} {activeExchange.fromCurrency.toUpperCase()}</span> to this address
              </p>
            </div>

            {/* Payout Address */}
            <div className="mb-6">
              <Label className="text-sm mb-2 block uppercase tracking-wider">Payout Address</Label>
              <Input
                value={activeExchange.payoutAddress}
                readOnly
                className="font-mono text-xs sm:text-sm bg-muted/10 border-primary/20"
                data-testid="input-payout-address"
              />
            </div>

            {/* ORDER ID */}
            <div className="p-5 bg-gradient-to-br from-destructive/20 via-orange-500/10 to-destructive/20 border-2 border-destructive/40 rounded-md mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-destructive mt-1 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-base font-bold text-destructive mb-2 uppercase tracking-wide">
                    Save Your Order ID
                  </p>
                  <div className="mb-3 p-3 bg-black/40 border border-destructive/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Order ID</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold font-mono text-primary break-all flex-1" data-testid="text-order-id">
                        {activeExchange.id}
                      </p>
                      <Button
                        onClick={handleCopyOrderId}
                        size="icon"
                        variant="outline"
                        className="border-destructive/40 hover-elevate"
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
                    <p className="font-semibold text-destructive">
                      This information will be deleted when you leave this page!
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Save this Order ID for tracking and support purposes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-md mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Transaction Instructions:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Send the exact amount to the deposit address</li>
                    <li>Wait for blockchain confirmations</li>
                    <li>Funds will be sent to your payout address automatically</li>
                    <li>This exchange expires in {timeRemaining}</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={clearActiveExchange}
              className="w-full"
              variant="outline"
              data-testid="button-new-exchange"
            >
              Create New Exchange
            </Button>
          </Card>

          {/* Privacy Visualization - ZK Privacy Tunnel */}
          <div className="lg:w-[420px] lg:sticky lg:top-8">
            <PrivacyVisualization 
              isActive={true}
              privacyScore={activeExchange.status === 'finished' ? 5 : 3}
              exchangeId={activeExchange.id}
              exchangeStatus={activeExchange.status}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render swap form
  const isPrivacyActive = Boolean(fromAmount && parseFloat(fromAmount) > 0 && fromCurrency && toCurrency);

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Matrix Background Effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
          backgroundSize: '100% 4px'
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
          backgroundSize: '4px 100%'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Swap Form - Left Side */}
          <Card className="w-full p-6 sm:p-8 bg-card/40 backdrop-blur-sm border-primary/20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
            ZK SWAP
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            Privacy-First Asset Swapping
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary uppercase tracking-wide">
              No KYC
            </span>
            <span className="px-3 py-1 bg-accent/10 border border-accent/30 rounded-full text-xs font-bold text-accent uppercase tracking-wide">
              Anonymous
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {loadingCurrencies && (
            <div className="flex items-center gap-2 p-3 bg-muted/10 border border-border rounded-md" data-testid="banner-loading-currencies">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading currencies...</span>
            </div>
          )}
          {currenciesError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="banner-error-currencies">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Failed to load currencies</span>
            </div>
          )}

          {/* From Currency */}
          <div>
            <Label htmlFor="from-currency" className="text-sm mb-2 block uppercase tracking-wider">
              You Send
            </Label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fromOpen}
                  className="w-full justify-between font-normal border-primary/20 hover-elevate"
                  disabled={loadingCurrencies}
                  data-testid="select-from-currency"
                >
                  {fromCurrency ? (
                    <span className="font-mono">
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
                  <CommandInput placeholder="Search currencies..." className="font-mono" />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {currencies.map((currency, index) => (
                        <CommandItem
                          key={`from-${currency.ticker}-${currency.network || 'none'}-${index}`}
                          value={`${currency.ticker} ${currency.name} ${currency.network || ''}`}
                          onSelect={() => {
                            setFromCurrency(currency.ticker.toLowerCase());
                            setFromNetwork(currency.network || "");
                            setFromOpen(false);
                          }}
                        >
                          <span className="font-mono font-medium">{currency.ticker.toUpperCase()}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{currency.name}</span>
                          {currency.network && (
                            <span className="ml-auto text-xs text-primary">{currency.network}</span>
                          )}
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
            <Label htmlFor="from-amount" className="text-sm mb-2 block uppercase tracking-wider">
              Amount
            </Label>
            <Input
              id="from-amount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="font-mono border-primary/20"
              data-testid="input-from-amount"
            />
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              size="icon"
              variant="outline"
              onClick={handleSwapCurrencies}
              className="rounded-full border-primary/30 hover-elevate active-elevate-2"
              data-testid="button-swap-currencies"
            >
              <ArrowDownUp className="w-4 h-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div>
            <Label htmlFor="to-currency" className="text-sm mb-2 block uppercase tracking-wider">
              You Receive
            </Label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={toOpen}
                  className="w-full justify-between font-normal border-primary/20 hover-elevate"
                  disabled={loadingCurrencies}
                  data-testid="select-to-currency"
                >
                  {toCurrency ? (
                    <span className="font-mono">
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
                  <CommandInput placeholder="Search currencies..." className="font-mono" />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {currencies.map((currency, index) => (
                        <CommandItem
                          key={`to-${currency.ticker}-${currency.network || 'none'}-${index}`}
                          value={`${currency.ticker} ${currency.name} ${currency.network || ''}`}
                          onSelect={() => {
                            setToCurrency(currency.ticker.toLowerCase());
                            setToNetwork(currency.network || "");
                            setToOpen(false);
                          }}
                        >
                          <span className="font-mono font-medium">{currency.ticker.toUpperCase()}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{currency.name}</span>
                          {currency.network && (
                            <span className="ml-auto text-xs text-primary">{currency.network}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Live Conversion */}
          {loadingEstimation ? (
            <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-md" data-testid="banner-loading-estimate">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Fetching live rates...</span>
            </div>
          ) : estimation && estimation.estimatedAmount ? (
            <div className="p-5 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 border-2 border-primary/30 rounded-md space-y-3" data-testid="box-live-estimate">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Estimate</span>
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] font-bold text-green-500 animate-pulse">LIVE</span>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono text-primary mb-1" data-testid="text-estimated-amount">
                  ≈ {estimation.estimatedAmount}
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  {toCurrency.toUpperCase()}
                </p>
              </div>
              {estimation.transactionSpeedForecast && (
                <div className="text-center pt-2 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    Est. Time: <span className="font-mono text-foreground">{estimation.transactionSpeedForecast}</span>
                  </p>
                </div>
              )}
            </div>
          ) : estimationError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="banner-error-estimate">
              <p className="text-sm text-destructive text-center">Failed to fetch estimate</p>
            </div>
          ) : null}

          {/* Payout Address */}
          <div>
            <Label htmlFor="payout-address" className="text-sm mb-2 block uppercase tracking-wider">
              Your Payout Address
            </Label>
            <Input
              id="payout-address"
              type="text"
              placeholder={`Enter your ${toCurrency.toUpperCase()} address`}
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              className="font-mono border-primary/20"
              data-testid="input-payout-address"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Funds will be sent to this address after the exchange
            </p>
          </div>

          {/* Create Exchange Button */}
          <Button
            onClick={handleCreateExchange}
            className="w-full mt-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
            disabled={createExchangeMutation.isPending || loadingCurrencies}
            data-testid="button-create-exchange"
          >
            {createExchangeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Exchange...
              </>
            ) : (
              'Create Anonymous Exchange'
            )}
          </Button>

          {/* Footer Info */}
          <div className="pt-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Powered by ZK Enigma Link Network
            </p>
            <p className="text-[10px] text-muted-foreground">
              Non-custodial • Trustless • Anonymous
            </p>
          </div>
        </div>
      </Card>

          {/* Privacy Panel - Zero-Knowledge Privacy */}
          <Card className="lg:sticky lg:top-8 p-6 sm:p-8 bg-card/60 backdrop-blur-sm border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-500 to-transparent rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-500 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  ZERO-KNOWLEDGE PRIVACY
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {isPrivacyActive ? 'Active Protection' : 'Ready to Activate'}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30 rounded-md" data-testid="privacy-status-identity">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> IDENTITY SHIELDED
                    </span>
                    <span className={`px-2 py-0.5 ${isPrivacyActive ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-muted/20 border-muted/50 text-muted-foreground'} border rounded-full text-[10px] font-bold`} data-testid="badge-privacy-identity">{isPrivacyActive ? 'ACTIVE' : 'READY'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Your wallet identity is cryptographically protected</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-md" data-testid="privacy-status-transaction">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> TRANSACTION OBFUSCATED
                    </span>
                    <span className={`px-2 py-0.5 ${isPrivacyActive ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-muted/20 border-muted/50 text-muted-foreground'} border rounded-full text-[10px] font-bold`} data-testid="badge-privacy-transaction">{isPrivacyActive ? 'ACTIVE' : 'READY'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Transaction details are encrypted end-to-end</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/30 rounded-md" data-testid="privacy-status-proof">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> PROOF VERIFIED
                    </span>
                    <span className={`px-2 py-0.5 ${isPrivacyActive ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-muted/20 border-muted/50 text-muted-foreground'} border rounded-full text-[10px] font-bold`} data-testid="badge-privacy-proof">{isPrivacyActive ? 'ACTIVE' : 'READY'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Zero-knowledge proof validation complete</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-md" data-testid="privacy-status-routing">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> ANONYMOUS ROUTING
                    </span>
                    <span className={`px-2 py-0.5 ${isPrivacyActive ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-muted/20 border-muted/50 text-muted-foreground'} border rounded-full text-[10px] font-bold`} data-testid="badge-privacy-routing">{isPrivacyActive ? 'ACTIVE' : 'READY'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Exchange routed through privacy network</p>
                </div>
              </div>

              <div className="p-6 bg-black/40 border border-primary/20 rounded-md mb-6" data-testid="box-zk-snark-circuit">
                <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-center bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                  ZK-SNARK Circuit {isPrivacyActive ? 'Active' : 'Standby'}
                </h3>
                <div className="space-y-3" data-testid="list-zk-snark-steps">
                  {[
                    { label: 'Witness Generation', delay: '0s' },
                    { label: 'Constraint System', delay: '0.3s' },
                    { label: 'Proof Compilation', delay: '0.6s' },
                    { label: 'Verification Layer', delay: '0.9s' },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                        style={{ animationDelay: step.delay }}
                      />
                      <div className="flex-1 h-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 animate-pulse shadow-[0_0_4px_rgba(34,211,238,0.4)]"
                          style={{ animationDelay: step.delay }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/30 rounded-md text-center">
                <p className="text-sm font-bold text-foreground mb-1">
                  PRIVACY GUARANTEED
                </p>
                <p className="text-xs text-muted-foreground">
                  Your swap is protected by military-grade zero-knowledge cryptography.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
