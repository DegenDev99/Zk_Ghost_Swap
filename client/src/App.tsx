import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwapPage from "@/pages/swap";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, History } from "lucide-react";

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                ZK SWAP
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-swap"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Swap
                </Button>
              </Link>
              <Link href="/history">
                <Button 
                  variant={location === "/history" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-history"
                >
                  <History className="w-4 h-4" />
                  History
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Switch>
        <Route path="/" component={SwapPage} />
        <Route path="/history" component={HistoryPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
