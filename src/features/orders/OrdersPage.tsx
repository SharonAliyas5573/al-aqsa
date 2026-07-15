import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ClipboardList, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STAGES } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { useOrders } from "./api";

export function OrdersPage() {
  const [stage, setStage] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useOrders({
    stage: stage ? Number(stage) : undefined,
    search: search || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="All orders across every stage"
        action={
          <Link to="/orders/new">
            <Button>
              <Plus /> New Order
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order no…"
            className="pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:max-w-xs sm:flex-1">
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All stages</option>
            {ORDER_STAGES.map((s, i) => (
              <option key={s} value={i + 1}>
                {i + 1}. {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders"
          description={
            stage ? "No orders in this stage." : "Create the first order."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-4 active:bg-accent">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{o.order_no}</p>
                    <Badge variant="secondary">
                      {ORDER_STAGES[o.current_stage - 1]}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.customer.name} · {formatCurrency(o.total_amount)}
                  </p>
                  {o.expected_delivery && (
                    <p className="text-xs text-muted-foreground">
                      Due{" "}
                      {new Date(o.expected_delivery).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge
                    variant={
                      o.payment_status === "paid"
                        ? "success"
                        : o.payment_status === "partial"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {o.payment_status}
                  </Badge>
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
