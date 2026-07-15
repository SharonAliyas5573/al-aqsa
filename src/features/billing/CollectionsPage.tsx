import { Link } from "react-router-dom";
import { Wallet, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useCollections } from "./api";

export function CollectionsPage() {
  const { data: rows, isLoading } = useCollections();
  const totalDue = (rows ?? []).reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <PageHeader
        title="Pending Collections"
        description="Orders with an outstanding balance"
      />

      <Card className="mb-6 bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm opacity-90">Total outstanding</p>
            <p className="text-3xl font-bold">{formatCurrency(totalDue)}</p>
          </div>
          <Wallet className="size-10 opacity-80" />
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="All collected"
          description="No orders have a pending balance."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-4 active:bg-accent">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{o.order_no}</p>
                    <Badge
                      variant={
                        o.payment_status === "partial" ? "warning" : "destructive"
                      }
                    >
                      {o.payment_status}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.customer.name} · {o.customer.phone}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-bold text-destructive">
                      {formatCurrency(o.balance)}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
