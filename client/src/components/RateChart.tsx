import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { normalizeNetwork, type RateDataPoint } from "@shared/schema";
import { TrendingUp } from "lucide-react";

interface RateChartProps {
  from: string;
  to: string;
  fromNetwork?: string;
  toNetwork?: string;
}

export function RateChart({ from, to, fromNetwork, toNetwork }: RateChartProps) {
  const [timeframe, setTimeframe] = useState<"1" | "24" | "168">("24");

  // Build currency identifiers with network if provided
  // Must match backend normalization for rate history lookup
  let fromCurrency = from.toLowerCase();
  let toCurrency = to.toLowerCase();

  if (fromNetwork && fromNetwork.toLowerCase() !== fromCurrency) {
    const normalizedNetwork = normalizeNetwork(fromNetwork);
    fromCurrency = `${fromCurrency}_${normalizedNetwork}`;
  }
  if (toNetwork && toNetwork.toLowerCase() !== toCurrency) {
    const normalizedNetwork = normalizeNetwork(toNetwork);
    toCurrency = `${toCurrency}_${normalizedNetwork}`;
  }

  const { data: rateHistory, isLoading, error } = useQuery<RateDataPoint[]>({
    queryKey: ["/api/swap/rate-history", fromCurrency, toCurrency, timeframe],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: fromCurrency,
        to: toCurrency,
        hours: timeframe,
      });
      const res = await fetch(`/api/swap/rate-history?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch rate history");
      }
      return await res.json();
    },
    enabled: !!from && !!to,
  });

  const timeframeLabels: Record<string, string> = {
    "1": "1 Hour",
    "24": "24 Hours",
    "168": "7 Days",
  };

  if (!from || !to) {
    return null;
  }

  const hasData = rateHistory && rateHistory.length > 0;

  const chartData = hasData
    ? rateHistory.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        rate: point.rate,
      }))
    : [];

  return (
    <Card data-testid="card-rate-chart" className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Exchange Rate History</CardTitle>
          </div>
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as "1" | "24" | "168")}>
            <TabsList>
              <TabsTrigger value="1" data-testid="tab-1h">1H</TabsTrigger>
              <TabsTrigger value="24" data-testid="tab-24h">24H</TabsTrigger>
              <TabsTrigger value="168" data-testid="tab-7d">7D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {error && (
          <div className="text-sm text-muted-foreground text-center py-8" data-testid="text-chart-error">
            Failed to load rate history
          </div>
        )}

        {!isLoading && !error && !hasData && (
          <div className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-data">
            No rate data available yet. Rates are recorded each time you get an estimate.
          </div>
        )}

        {!isLoading && !error && hasData && (
          <div data-testid="chart-rate-history">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-sm text-muted-foreground" data-testid="text-chart-info">
              Showing {rateHistory.length} data points over {timeframeLabels[timeframe]}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
