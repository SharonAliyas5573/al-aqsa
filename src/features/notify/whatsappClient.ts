import { toast } from "sonner";
import { config } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type { OrderFull } from "@/lib/database.types";
import {
  BALANCE_REMINDER,
  STAGE_TEMPLATES,
  varsFromOrder,
  type WaTemplate,
  type TemplateVars,
} from "./templates";

/**
 * WhatsApp send abstraction. In "mock" mode (default) it renders the template
 * and surfaces it as a toast + console log — the app runs end-to-end with no
 * Meta account. In "live" mode it calls the send-whatsapp Edge Function, which
 * talks to the Meta Cloud API.
 */
async function send(
  to: string | null,
  template: WaTemplate,
  vars: TemplateVars,
): Promise<void> {
  const body = template.render(vars);

  if (config.whatsappMode === "mock" || !to) {
    console.info(
      `[WhatsApp mock → ${to ?? "no number"}] (${template.name})\n${body}`,
    );
    toast.message("WhatsApp (mock)", { description: body });
    return;
  }

  try {
    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: { to, template: template.name, variables: vars, text: body },
    });
    if (error) throw error;
    toast.success("WhatsApp sent", { description: body });
  } catch (err) {
    toast.error("WhatsApp failed", { description: (err as Error).message });
  }
}

/** Fire the message tied to a given stage (if any). */
export async function notifyStageChange(order: OrderFull, stage: number) {
  const template = STAGE_TEMPLATES[stage];
  if (!template) return; // stages without a message
  const to = order.customer.whatsapp_number || order.customer.phone;
  await send(to, template, varsFromOrder(order));
}

/** Manual balance-due reminder from the billing screen. */
export async function notifyBalanceDue(order: OrderFull, amount: number) {
  const to = order.customer.whatsapp_number || order.customer.phone;
  await send(to, BALANCE_REMINDER, { ...varsFromOrder(order), amount });
}
