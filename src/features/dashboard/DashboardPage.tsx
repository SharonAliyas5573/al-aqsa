import { Link } from "react-router-dom";
import {
  ClipboardList,
  Truck,
  Wallet,
  AlertTriangle,
  Plus,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useAuth, useRole } from "@/features/auth/AuthProvider";
import { formatCurrency } from "@/lib/utils";
import { config } from "@/lib/config";
import { useDashboard } from "./api";

export function DashboardPage() {
  const { profile } = useAuth();
  const { isOwner, isTailor, can } = useRole();
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] || "there"}`}
        description={config.shop.name}
        action={
          can(["owner", "counter"]) && (
            <div className="flex gap-2">
              <Link to="/customers">
                <Button variant="outline">
                  <UserPlus /> New Customer
                </Button>
              </Link>
              <Link to="/orders/new">
                <Button>
                  <Plus /> New Order
                </Button>
              </Link>
            </div>
          )
        }
      />

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* KPI tiles */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              to="/orders"
              icon={ClipboardList}
              label="Active orders"
              value={String(data.activeOrders)}
            />
            <Kpi
              to="/orders"
              icon={Truck}
              label="Deliveries due today"
              value={String(data.deliveriesToday.length)}
            />
            {!isTailor && (
              <Kpi
                to={isOwner ? "/collections" : "/orders"}
                icon={Wallet}
                label="Pending collections"
                value={formatCurrency(data.pendingCollectionsTotal)}
              />
            )}
            {!isTailor && (
              <Kpi
                to="/inventory"
                icon={AlertTriangle}
                label="Low-stock fabrics"
                value={String(data.lowStock.length)}
                warning={data.lowStock.length > 0}
              />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Orders by stage */}
            <Card>
              <CardHeader>
                <CardTitle>Orders by stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.stageCounts.map((s) => {
                  const max = Math.max(
                    1,
                    ...data.stageCounts.map((x) => x.count),
                  );
                  return (
                    <div key={s.stage} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm text-muted-foreground">
                        {s.stage}. {s.label}
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(s.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-medium">
                        {s.count}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Deliveries today */}
            <Card>
              <CardHeader>
                <CardTitle>Today's deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                {data.deliveriesToday.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No deliveries due today.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.deliveriesToday.map((o) => (
                      <Link key={o.id} to={`/orders/${o.id}`}>
                        <div className="flex items-center justify-between rounded-md border p-3 active:bg-accent">
                          <div>
                            <p className="font-medium">{o.order_no}</p>
                            <p className="text-sm text-muted-foreground">
                              {o.customer.name}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            Stage {o.current_stage}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Low stock alerts */}
          {!isTailor && data.lowStock.length > 0 && (
            <Card className="border-amber-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="size-5" /> Low stock
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.lowStock.map((f) => (
                  <Badge key={f.id} variant="warning">
                    {f.name}: {f.stock_metres}m
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({
  to,
  icon: Icon,
  label,
  value,
  warning,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <Link to={to}>
      <Card className={warning ? "border-amber-400" : ""}>
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
              warning ? "bg-amber-100 text-amber-700" : "bg-accent text-primary"
            }`}
          >
            <Icon className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="truncate text-2xl font-bold">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
