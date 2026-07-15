import type { OrderFull, OrderItemFull } from "@/lib/database.types";
import { useGarmentTypeFull } from "@/features/garments/api";
import { Divider, ReceiptHeader, Row, receiptStyle } from "./ReceiptPrimitives";
import { formatMeasurement } from "./printHelpers";

/**
 * 80mm job order for the cutter/tailor: order no, due date, customer, garment
 * type + model, and the full measurements (label : value + model name). No
 * prices. Hidden until printed via printNode("job-order").
 */
export function JobOrder({ order }: { order: OrderFull }) {
  return (
    <div id="job-order" className="print-doc" style={receiptStyle}>
      <ReceiptHeader subtitle="JOB ORDER" />
      <Row label="Order" value={order.order_no} />
      <Row
        label="Due"
        value={
          order.expected_delivery
            ? new Date(order.expected_delivery).toLocaleDateString("en-IN")
            : "—"
        }
      />
      <Row label="Customer" value={order.customer.name} />
      <Row label="Tailor" value={order.tailor?.full_name ?? "Unassigned"} />
      <Divider />
      {order.items.map((it) => (
        <JobOrderItem key={it.id} item={it} />
      ))}
    </div>
  );
}

function JobOrderItem({ item }: { item: OrderItemFull }) {
  const { data: garment } = useGarmentTypeFull(
    item.garment_type_id ?? undefined,
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>
        {item.quantity} × {item.garment_type?.name ?? "Garment"}
        {item.garment_model ? ` — ${item.garment_model.name}` : ""}
      </div>
      {item.stitch_note && (
        <div style={{ fontSize: "10px", marginBottom: 2 }}>
          {item.stitch_note}
        </div>
      )}
      {garment?.fields
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((f) => (
          <Row
            key={f.id}
            label={f.label}
            value={formatMeasurement(f, item.measurements?.[f.key], garment.models)}
          />
        ))}
      <Divider />
    </div>
  );
}
