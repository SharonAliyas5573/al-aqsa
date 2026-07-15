import type { OrderFull } from "@/lib/database.types";

/**
 * The 5 WhatsApp templates from the PRD, keyed by the stage that triggers them.
 * `name` matches the Meta-approved template name (used in the live path).
 * Only a subset of the 9 stages sends a message.
 */
export interface WaTemplate {
  name: string;
  render: (vars: TemplateVars) => string;
}

export interface TemplateVars {
  name: string;
  id: string;
  date: string;
  amount?: number;
}

export const STAGE_TEMPLATES: Record<number, WaTemplate> = {
  1: {
    name: "order_received",
    render: (v) =>
      `Hi ${v.name}, your order #${v.id} has been received. Expected delivery: ${v.date}.`,
  },
  4: {
    name: "order_stitching",
    render: (v) =>
      `Hi ${v.name}, your order #${v.id} is now being stitched. We'll update you soon.`,
  },
  8: {
    name: "order_packed",
    render: (v) =>
      `Hi ${v.name}, your order #${v.id} is packed and ready for pickup!`,
  },
  9: {
    name: "order_delivered",
    render: (v) =>
      `Hi ${v.name}, thank you! Your order #${v.id} has been delivered. Visit us again.`,
  },
};

export const BALANCE_REMINDER: WaTemplate = {
  name: "balance_reminder",
  render: (v) =>
    `Hi ${v.name}, balance payment of ₹${v.amount} is due for order #${v.id}.`,
};

export function varsFromOrder(order: OrderFull): TemplateVars {
  return {
    name: order.customer.name,
    id: order.order_no,
    date: order.expected_delivery
      ? new Date(order.expected_delivery).toLocaleDateString("en-IN")
      : "—",
  };
}
