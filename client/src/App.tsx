import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwapPage from "@/pages/swap";
import MemeMixerPage from "@/pages/meme-mixer";
import HistoryPage from "@/pages/history";
import DocsPage from "@/pages/docs";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, History, Wallet, FileText, LogOut, Shield, Mail, Menu } from "lucide-react";
import { SiX } from "react-icons/si";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import logoImage from "@assets/Untitled design - 2025-11-19T084305.349_1763559907026.png";
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
        <div className="w-full px-3 sm:px-4">
          <div className="flex items-center h-14 sm:h-16 relative">
            {/* Logo and Brand - Far left */}
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={logoImage} 
                alt="Zk Ghost Swap Logo" 
                className="h-10 w-auto sm:h-12 md:h-14"
                data-testid="img-logo-main"
              />
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold whitespace-nowrap">
                <span className="text-[#00D9FF]">Zk Ghost</span>
                <span className="text-[#6600FF]"> Swap</span>
              </div>
            </div>
            
            {/* Navigation - Absolute Center (Desktop only) */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-1 sm:gap-2 pointer-events-auto z-10">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm pointer-events-auto"
                  data-testid="link-swap"
                  aria-label="Swap"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Swap</span>
                </Button>
              </Link>
              <Link href="/mixer">
                <Button 
                  variant={location === "/mixer" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm pointer-events-auto"
                  data-testid="link-mixer"
                  aria-label="Meme Mixer"
                >
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Meme Mixer</span>
                </Button>
              </Link>
              <Link href="/docs">
                <Button 
                  variant={location === "/docs" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm pointer-events-auto"
                  data-testid="link-docs"
                  aria-label="Documentation"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Docs</span>
                </Button>
              </Link>
            </div>

            {/* Social and Wallet - Right */}
            <div className="ml-auto flex items-center gap-2">
              {/* Mobile Navigation Dropdown */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid="button-mobile-menu"
                      aria-label="Navigation menu"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        data-testid="mobile-menu-swap"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Swap</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/mixer">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        data-testid="mobile-menu-mixer"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Meme Mixer</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/docs">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        data-testid="mobile-menu-docs"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Documentation</span>
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <a
                href="https://x.com/ZKGhostSwap"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on X (Twitter)"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="link-twitter"
                >
                  <SiX className="w-4 h-4" />
                </Button>
              </a>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Switch>
        <Route path="/" component={SwapPage} />
        <Route path="/mixer" component={MemeMixerPage} />
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
