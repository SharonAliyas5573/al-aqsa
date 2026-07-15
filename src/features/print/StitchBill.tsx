import type { OrderFull } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { paidTotal } from "@/features/billing/api";
import { Divider, ReceiptHeader, Row, receiptStyle } from "./ReceiptPrimitives";

/**
 * 80mm stitch bill: what to stitch + amount per line, stitch total, and the
 * order's paid/balance. Hidden until printed via printNode("stitch-bill").
 */
export function StitchBill({ order }: { order: OrderFull }) {
  const stitchTotal = order.items.reduce(
    (s, it) => s + Number(it.stitch_amount || 0),
    0,
  );
  const paid = paidTotal(order.payments);
  const balance = Number(order.total_amount) - paid;

  return (
    <div id="stitch-bill" className="print-doc" style={receiptStyle}>
      <ReceiptHeader subtitle="STITCHING BILL" />
      <Row label="Order" value={order.order_no} />
      <Row
        label="Date"
        value={new Date(order.created_at).toLocaleDateString("en-IN")}
      />
      <Row label="Customer" value={order.customer.name} />
      <Row label="Phone" value={order.customer.phone} />
      <Divider />
      {order.items.map((it) => (
        <div key={it.id} style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>
            {it.quantity} × {it.garment_type?.name ?? "Garment"}
            {it.garment_model ? ` (${it.garment_model.name})` : ""}
          </div>
          {it.stitch_note && (
            <div style={{ fontSize: "10px" }}>{it.stitch_note}</div>
          )}
          <Row
            label="Stitch charge"
            value={formatCurrency(Number(it.stitch_amount || 0))}
          />
        </div>
      ))}
      <Divider />
      <Row label="Stitch Total" value={formatCurrency(stitchTotal)} bold />
      <Divider />
      <Row label="Order Total" value={formatCurrency(Number(order.total_amount))} />
      <Row label="Paid" value={formatCurrency(paid)} />
      <Row label="Balance" value={formatCurrency(balance)} bold={balance > 0} />
      <Divider />
      <div style={{ textAlign: "center", marginTop: 6 }}>
        Thank you! Visit again.
      </div>
    </div>
  );
}
