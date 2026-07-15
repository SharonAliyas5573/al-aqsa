import type { jsPDF } from "jspdf";
import { config } from "@/lib/config";
import {
  ORDER_STAGES,
  clothAmount,
  type OrderFull,
} from "@/lib/database.types";
import { paidTotal } from "@/features/billing/api";

/**
 * Build the A4 invoice PDF for an order. jsPDF + autotable are heavy (they pull
 * in html2canvas), so we load them dynamically — they stay out of the initial
 * bundle and only download the first time someone prints/shares an invoice.
 */
export async function buildInvoice(order: OrderFull): Promise<jsPDF> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  // Header / branding
  doc.setFontSize(20).setFont("helvetica", "bold");
  doc.text(config.shop.name, margin, y);
  y += 18;
  doc.setFontSize(10).setFont("helvetica", "normal");
  if (config.shop.address) {
    doc.text(config.shop.address, margin, y);
    y += 12;
  }
  if (config.shop.phone) {
    doc.text(config.shop.phone, margin, y);
    y += 12;
  }

  // Invoice meta (right aligned)
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text("INVOICE", pageW - margin, margin, { align: "right" });
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(order.order_no, pageW - margin, margin + 16, { align: "right" });
  doc.text(
    new Date(order.created_at).toLocaleDateString("en-IN"),
    pageW - margin,
    margin + 30,
    { align: "right" },
  );

  y += 14;
  doc.setDrawColor(200).line(margin, y, pageW - margin, y);
  y += 20;

  // Bill-to
  doc.setFont("helvetica", "bold").text("Bill To", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(order.customer.name, margin, y);
  y += 12;
  doc.text(order.customer.phone, margin, y);
  if (order.customer.address) {
    y += 12;
    doc.text(order.customer.address, margin, y);
  }
  y += 10;

  doc.text(
    `Current stage: ${ORDER_STAGES[order.current_stage - 1]}`,
    pageW - margin,
    y - (order.customer.address ? 22 : 10),
    { align: "right" },
  );
  if (order.expected_delivery) {
    doc.text(
      `Delivery: ${new Date(order.expected_delivery).toLocaleDateString("en-IN")}`,
      pageW - margin,
      y - (order.customer.address ? 10 : -2),
      { align: "right" },
    );
  }
  y += 16;

  // Items table — cloth + stitch split per line.
  autoTable(doc, {
    startY: y,
    head: [["Garment", "Model", "Qty", "Fabric", "Cloth", "Stitch"]],
    body: order.items.map((it) => [
      it.garment_type?.name ?? "-",
      it.garment_model?.name ?? "-",
      String(it.quantity),
      it.fabric
        ? `${it.fabric.name}${it.colour ? ` (${it.colour})` : ""}`
        : "-",
      `Rs ${clothAmount(it).toLocaleString("en-IN")}`,
      `Rs ${Number(it.stitch_amount || 0).toLocaleString("en-IN")}`,
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error lastAutoTable is added by the plugin
  y = doc.lastAutoTable.finalY + 20;

  // Measurement summary (from the first item that has captured values).
  const withM = order.items.find(
    (it) => it.measurements && Object.keys(it.measurements).length > 0,
  );
  if (withM?.measurements) {
    doc.setFont("helvetica", "bold").text("Measurements", margin, y);
    y += 6;
    const rows = Object.entries(withM.measurements)
      .map(([key, v]) => {
        const parts: string[] = [];
        if (v.value != null) parts.push(String(v.value));
        if (v.note) parts.push(v.note);
        return [key, parts.join(" · ") || "-"] as [string, string];
      })
      .filter(([, val]) => val !== "-");
    if (rows.length > 0) {
      autoTable(doc, {
        startY: y,
        body: rows,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
        margin: { left: margin, right: margin },
      });
      // @ts-expect-error lastAutoTable is added by the plugin
      y = doc.lastAutoTable.finalY + 20;
    }
  }

  // Payment summary
  const paid = paidTotal(order.payments);
  const balance = Number(order.total_amount) - paid;
  autoTable(doc, {
    startY: y,
    body: [
      ["Total", `Rs ${Number(order.total_amount).toLocaleString("en-IN")}`],
      ["Paid", `Rs ${paid.toLocaleString("en-IN")}`],
      ["Balance due", `Rs ${balance.toLocaleString("en-IN")}`],
    ],
    theme: "plain",
    styles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 120 },
      1: { halign: "right" },
    },
    margin: { left: pageW - margin - 240, right: margin },
  });

  const bottom = doc.internal.pageSize.getHeight() - margin;
  doc.setFontSize(9).setTextColor(120);
  doc.text("Thank you for choosing us!", margin, bottom);

  return doc;
}

/** Trigger a browser download of the invoice PDF. */
export async function downloadInvoice(order: OrderFull) {
  const doc = await buildInvoice(order);
  doc.save(`${order.order_no}.pdf`);
}

/**
 * Share the invoice via the Web Share API (WhatsApp etc.). Falls back to a
 * plain download if the platform can't share files.
 */
export async function shareInvoice(order: OrderFull): Promise<void> {
  const doc = await buildInvoice(order);
  const blob = doc.output("blob");
  const file = new File([blob], `${order.order_no}.pdf`, {
    type: "application/pdf",
  });

  if (
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: `Invoice ${order.order_no}`,
      text: `Invoice for order ${order.order_no} — ${config.shop.name}`,
    });
  } else {
    doc.save(`${order.order_no}.pdf`);
  }
}
