import { config } from "@/lib/config";

/** Shared 80mm thermal-receipt building blocks (monospace, high contrast). */

export const receiptStyle: React.CSSProperties = {
  width: "80mm",
  padding: "4mm",
  fontFamily: "'Courier New', monospace",
  fontSize: "11px",
  color: "#000",
  lineHeight: 1.4,
};

export function ReceiptHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 6 }}>
      <div style={{ fontSize: "15px", fontWeight: 700 }}>{config.shop.name}</div>
      {config.shop.phone && <div>{config.shop.phone}</div>}
      {config.shop.address && (
        <div style={{ fontSize: "10px" }}>{config.shop.address}</div>
      )}
      {subtitle && (
        <div style={{ marginTop: 4, fontWeight: 700 }}>{subtitle}</div>
      )}
    </div>
  );
}

export function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function Divider() {
  return (
    <div
      style={{ borderTop: "1px dashed #000", margin: "5px 0" }}
      aria-hidden
    />
  );
}
