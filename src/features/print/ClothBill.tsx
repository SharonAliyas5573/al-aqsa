import { clothAmount, type OrderFull } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { Divider, ReceiptHeader, Row, receiptStyle } from "./ReceiptPrimitives";

/**
 * 80mm cloth bill: per line fabric name, metres, rate and amount. Hidden until
 * printed via printNode("cloth-bill").
 */
export function ClothBill({ order }: { order: OrderFull }) {
  const clothItems = order.items.filter((it) => it.fabric);
  const total = clothItems.reduce((s, it) => s + clothAmount(it), 0);

  return (
    <div id="cloth-bill" className="print-doc" style={receiptStyle}>
      <ReceiptHeader subtitle="CLOTH BILL" />
      <Row label="Order" value={order.order_no} />
      <Row
        label="Date"
        value={new Date(order.created_at).toLocaleDateString("en-IN")}
      />
      <Row label="Customer" value={order.customer.name} />
      <Row label="Phone" value={order.customer.phone} />
      <Divider />
      {clothItems.length === 0 && <div>No cloth items.</div>}
      {clothItems.map((it) => (
        <div key={it.id} style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>
            {it.fabric?.name}
            {it.colour ? ` · ${it.colour}` : ""}
          </div>
          <Row
            label={`${it.fabric_metres ?? 0}m × ${it.quantity} × ₹${
              it.fabric?.rate_per_metre ?? 0
            }`}
            value={formatCurrency(clothAmount(it))}
          />
        </div>
      ))}
      <Divider />
      <Row label="Cloth Total" value={formatCurrency(total)} bold />
      <Divider />
      <div style={{ textAlign: "center", marginTop: 6 }}>
        Thank you! Visit again.
      </div>
    </div>
  );
}
