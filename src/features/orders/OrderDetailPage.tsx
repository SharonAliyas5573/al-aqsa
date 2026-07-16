import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  FileDown,
  Share2,
  Plus,
  Phone,
  Bell,
  Scissors,
  Shirt,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/features/auth/AuthProvider";
import { paidTotal } from "@/features/billing/api";
import { PaymentDialog } from "@/features/billing/PaymentDialog";
import { ClothBill } from "@/features/print/ClothBill";
import { StitchBill } from "@/features/print/StitchBill";
import { JobOrder } from "@/features/print/JobOrder";
import { printNode, formatMeasurement } from "@/features/print/printHelpers";
import { downloadInvoice, shareInvoice } from "@/features/print/a4Invoice";
import { notifyBalanceDue } from "@/features/notify/whatsappClient";
import { useGarmentTypeFull, modelPhotoUrl } from "@/features/garments/api";
import { formatCurrency } from "@/lib/utils";
import {
  ORDER_STAGES,
  clothAmount,
  type OrderItemFull,
} from "@/lib/database.types";
import { useOrder } from "./api";
import { StageTracker } from "./StageTracker";

export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useOrder(id);
  const { isOwner } = useRole();
  const canBill = isOwner; // payments/collections are owner-only
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!order) return <p>Order not found.</p>;

  const paid = paidTotal(order.payments);
  const balance = Number(order.total_amount) - paid;
  const clothTotal = order.items.reduce((s, it) => s + clothAmount(it), 0);
  const stitchTotal = order.items.reduce(
    (s, it) => s + Number(it.stitch_amount || 0),
    0,
  );

  return (
    <div>
      <Link
        to="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <PageHeader
        title={order.order_no}
        description={`${order.customer.name} · ${order.customer.phone}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => printNode("job-order")}>
              <ClipboardList /> Job Order
            </Button>
            <Button variant="outline" onClick={() => printNode("cloth-bill")}>
              <Scissors /> Cloth Bill
            </Button>
            <Button variant="outline" onClick={() => printNode("stitch-bill")}>
              <Shirt /> Stitch Bill
            </Button>
            <Link to={`/orders/${order.id}/edit`}>
              <Button variant="outline">
                <Pencil /> Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={() => downloadInvoice(order)}>
              <FileDown /> A4 PDF
            </Button>
            <Button onClick={() => shareInvoice(order).catch(() => {})}>
              <Share2 /> Share
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stage tracker */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Production Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <StageTracker order={order} />
          </CardContent>
        </Card>

        {/* Items + measurements */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((it) => (
                <OrderItemDetail key={it.id} item={it} />
              ))}
            </CardContent>
          </Card>

          {/* Payments — hidden for tailors */}
          {canBill && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Payment</CardTitle>
                <Badge
                  variant={
                    order.payment_status === "paid"
                      ? "success"
                      : order.payment_status === "partial"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {order.payment_status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                  <Stat label="Cloth" value={formatCurrency(clothTotal)} />
                  <Stat label="Stitch" value={formatCurrency(stitchTotal)} />
                  <Stat
                    label="Paid"
                    value={formatCurrency(paid)}
                  />
                  <Stat
                    label="Balance"
                    value={formatCurrency(balance)}
                    highlight={balance > 0}
                  />
                </div>

                {order.payments.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {order.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {new Date(p.paid_at).toLocaleDateString("en-IN")} ·{" "}
                          <span className="uppercase">{p.mode}</span>
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(p.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setPayOpen(true)} disabled={balance <= 0}>
                    <Plus /> Record payment
                  </Button>
                  {balance > 0 && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        notifyBalanceDue(order, balance).then(() =>
                          toast.success("Balance reminder queued"),
                        )
                      }
                    >
                      <Bell /> Send balance reminder
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <Meta
                label="Due date"
                value={
                  order.expected_delivery
                    ? new Date(order.expected_delivery).toLocaleDateString(
                        "en-IN",
                      )
                    : "Not set"
                }
              />
              <Meta
                label="Assigned staff"
                value={order.tailor?.full_name ?? "Unassigned"}
              />
              <Meta
                label="Current stage"
                value={`${order.current_stage}. ${ORDER_STAGES[order.current_stage - 1]}`}
              />
              <div className="sm:col-span-2">
                <a
                  href={`tel:${order.customer.phone}`}
                  className="inline-flex items-center gap-2 text-sm text-primary"
                >
                  <Phone className="size-4" /> Call {order.customer.name}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {canBill && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          orderId={order.id}
          balance={balance}
        />
      )}

      {/* Hidden print docs for window.print() */}
      <ClothBill order={order} />
      <StitchBill order={order} />
      <JobOrder order={order} />
    </div>
  );
}

/** One item card with dynamic measurements + chosen model photos. */
function OrderItemDetail({ item }: { item: OrderItemFull }) {
  const { data: garment } = useGarmentTypeFull(
    item.garment_type_id ?? undefined,
  );
  const modelUrl = modelPhotoUrl(item.garment_model?.photo_path ?? null);
  const fields = (garment?.fields ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {modelUrl && (
            <img
              src={modelUrl}
              alt={item.garment_model?.name ?? ""}
              className="size-14 rounded-md object-cover"
            />
          )}
          <div>
            <p className="font-semibold">
              {item.quantity} × {item.garment_type?.name ?? "Garment"}
            </p>
            {item.garment_model && (
              <p className="text-sm text-muted-foreground">
                Model: {item.garment_model.name}
              </p>
            )}
          </div>
        </div>
        {item.fabric && (
          <Badge variant="secondary">
            {item.fabric.name}
            {item.colour ? ` · ${item.colour}` : ""}
          </Badge>
        )}
      </div>

      {item.stitch_note && (
        <p className="mt-2 text-sm text-muted-foreground">{item.stitch_note}</p>
      )}

      {fields.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.id} className="rounded bg-muted px-2 py-1 text-xs">
              <span className="text-muted-foreground">{f.label}:</span>{" "}
              <span className="font-medium">
                {formatMeasurement(f, item.measurements?.[f.key], garment?.models)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
