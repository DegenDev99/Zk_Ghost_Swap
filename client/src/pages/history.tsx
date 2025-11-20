import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, ArrowRight, Check, AlertCircle, XCircle, Clock8 } from "lucide-react";
import type { Exchange } from "@shared/schema";
import { format } from "date-fns";

export default function HistoryPage() {
  const { data: exchanges = [], isLoading, isError } = useQuery<Exchange[]>({
    queryKey: ["/api/swap/history"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "finished":
        return <Check className="w-4 h-4 text-green-500" />;
      case "failed":
      case "refunded":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "waiting":
        return <Clock8 className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50" data-testid={`badge-status-${status}`}>COMPLETED</Badge>;
      case "failed":
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}>FAILED</Badge>;
      case "refunded":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/50" data-testid={`badge-status-${status}`}>REFUNDED</Badge>;
      case "waiting":
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>WAITING</Badge>;
      case "confirming":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50" data-testid={`badge-status-${status}`}>CONFIRMING</Badge>;
      case "exchanging":
        return <Badge className="bg-secondary/20 text-secondary border-secondary/50" data-testid={`badge-status-${status}`}>EXCHANGING</Badge>;
      case "sending":
        return <Badge className="bg-primary/20 text-primary border-primary/50" data-testid={`badge-status-${status}`}>SENDING</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent" data-testid="heading-history">
            TRANSACTION HISTORY
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
            Your Complete Swap Records
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16" data-testid="banner-loading-history">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading transaction history...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card className="p-8 bg-destructive/10 border-destructive/30" data-testid="banner-error-history">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-destructive mb-1">Failed to Load History</p>
                <p className="text-sm text-muted-foreground">
                  Unable to fetch your transaction history. Please try again later.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && exchanges.length === 0 && (
          <Card className="p-12 text-center bg-card/60 backdrop-blur-sm border-primary/30" data-testid="banner-empty-history">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Transactions Yet</h2>
            <p className="text-muted-foreground">
              Your swap history will appear here once you create your first exchange.
            </p>
          </Card>
        )}

        {/* Exchange List */}
        {!isLoading && !isError && exchanges.length > 0 && (
          <div className="space-y-4" data-testid="list-exchange-history">
            {exchanges.map((exchange) => (
              <Card 
                key={exchange.id} 
                className="p-6 bg-card/60 backdrop-blur-sm border-primary/20 hover-elevate transition-all"
                data-testid={`card-exchange-${exchange.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      {getStatusIcon(exchange.status)}
                    </div>
                  </div>

                  {/* Exchange Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">From</p>
                          <p className="font-mono font-bold text-sm sm:text-base md:text-lg text-foreground break-all">{exchange.fromAmount}</p>
                          <p className="font-mono text-xs sm:text-sm text-primary">{exchange.fromCurrency.toUpperCase()}</p>
                        </div>
                        
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                        
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">To</p>
                          <p className="font-mono font-bold text-sm sm:text-base md:text-lg text-foreground break-all">{exchange.toAmount}</p>
                          <p className="font-mono text-xs sm:text-sm text-primary">{exchange.toCurrency.toUpperCase()}</p>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {getStatusBadge(exchange.status)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Order ID:</span>
                        <code className="font-mono text-foreground px-1.5 py-0.5 bg-muted/30 rounded" data-testid={`text-order-id-${exchange.id}`}>
                          {exchange.id}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
