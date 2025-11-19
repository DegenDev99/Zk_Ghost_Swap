import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwapPage from "@/pages/swap";
import HistoryPage from "@/pages/history";
import DocsPage from "@/pages/docs";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, History, Wallet, FileText, LogOut } from "lucide-react";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import logoImage from "@assets/ChatGPT Image Nov 18, 2025, 05_40_02 PM_1763507596567.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useState } from "react";

function WalletButton() {
  const { walletAddress, connected, connecting, connect, disconnect } = useWallet();
  const [, setLocation] = useLocation();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleDisconnect = () => {
    disconnect();
    setShowDisconnectDialog(false);
  };

  if (connected && walletAddress) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 font-mono text-xs sm:text-sm"
              data-testid="button-wallet-menu"
              aria-label="Wallet menu"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-mono text-xs">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLocation("/history")}
              className="gap-2 cursor-pointer"
              data-testid="menu-item-history"
            >
              <History className="w-4 h-4" />
              <span>Transaction History</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDisconnectDialog(true)}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              data-testid="menu-item-disconnect"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Wallet?</AlertDialogTitle>
              <AlertDialogDescription>
                Disconnecting your wallet will remove access to your transaction history. 
                Your active exchange will remain accessible via the Order ID, but you'll need to reconnect 
                your wallet to view your complete history again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-disconnect">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-disconnect"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={connect}
      disabled={connecting}
      className="gap-1 sm:gap-2 text-xs sm:text-sm"
      data-testid="button-wallet-connect"
      aria-label={connecting ? "Connecting wallet" : "Connect wallet"}
    >
      <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="hidden xs:inline">{connecting ? "Connecting..." : "Connect Wallet"}</span>
    </Button>
  );
}

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo and Brand - Left aligned */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <img 
                src={logoImage} 
                alt="Zk Ghost Swap Logo" 
                className="h-7 w-auto sm:h-8 md:h-9"
                data-testid="img-logo-main"
              />
              <div className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                ZK GHOST SWAP
              </div>
            </div>
            
            {/* Navigation - Right aligned */}
            <div className="flex gap-1 sm:gap-2">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  data-testid="link-swap"
                  aria-label="Swap"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Swap</span>
                </Button>
              </Link>
              <Link href="/docs">
                <Button 
                  variant={location === "/docs" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  data-testid="link-docs"
                  aria-label="Documentation"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Docs</span>
                </Button>
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Switch>
        <Route path="/" component={SwapPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/docs" component={DocsPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
