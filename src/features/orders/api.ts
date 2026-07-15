import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  clothAmount,
  type MeasurementValues,
  type Order,
  type OrderFull,
  type OrderWithCustomer,
} from "@/lib/database.types";
import { notifyStageChange } from "@/features/notify/whatsappClient";

/** Orders list (optionally filtered by stage, tailor, or order-no search). */
export function useOrders(opts?: {
  stage?: number;
  tailorId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["orders", opts ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("*, customer:customers(*)")
        .order("created_at", { ascending: false });
      if (opts?.stage) q = q.eq("current_stage", opts.stage);
      if (opts?.tailorId) q = q.eq("assigned_tailor", opts.tailorId);
      if (opts?.search?.trim()) {
        q = q.ilike("order_no", `%${opts.search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as OrderWithCustomer[];
    },
  });
}

export function useOrdersByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ["orders", "customer", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customer:customers(*)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderWithCustomer[];
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
           customer:customers(*),
           items:order_items(
             *,
             fabric:fabrics(*),
             garment_type:garment_types(*),
             garment_model:field_models(*)
           ),
           payments(*),
           stage_history:order_stage_history(*),
           tailor:profiles!orders_assigned_tailor_fkey(*)`,
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      const order = data as unknown as OrderFull;
      order.payments.sort((a, b) => a.paid_at.localeCompare(b.paid_at));
      order.stage_history.sort((a, b) =>
        a.changed_at.localeCompare(b.changed_at),
      );
      return order;
    },
  });
}

export interface OrderItemInput {
  garment_type_id: string | null;
  garment_model_id: string | null;
  quantity: number;
  fabric_id: string | null;
  fabric_metres: number | null;
  colour: string | null;
  stitch_note: string | null;
  stitch_amount: number;
  measurements: MeasurementValues;
  design_notes: string | null;
}

export interface OrderInput {
  id?: string;
  customer_id: string;
  expected_delivery: string | null;
  assigned_tailor: string | null;
  /** Fabric rate per item id, to compute cloth totals client-side. */
  items: (OrderItemInput & { fabric_rate?: number })[];
}

/** Total = Σ cloth (metres × qty × rate) + Σ stitch amount. */
export function computeOrderTotal(
  items: (OrderItemInput & { fabric_rate?: number })[],
): number {
  return items.reduce((sum, it) => {
    const cloth =
      (it.fabric_metres ?? 0) * it.quantity * (it.fabric_rate ?? 0);
    return sum + cloth + (it.stitch_amount || 0);
  }, 0);
}

/** Create or update an order together with its item lines. */
export function useSaveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrderInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const total = computeOrderTotal(input.items);

      const stripRate = (it: OrderItemInput & { fabric_rate?: number }) => {
        const { fabric_rate: _r, ...rest } = it;
        return rest;
      };

      if (input.id) {
        // Header only; item edits are not re-deducted from stock (Phase 1).
        const { error: uErr } = await supabase
          .from("orders")
          .update({
            customer_id: input.customer_id,
            expected_delivery: input.expected_delivery,
            assigned_tailor: input.assigned_tailor,
            total_amount: total,
          })
          .eq("id", input.id);
        if (uErr) throw uErr;
        return { id: input.id };
      }

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: input.customer_id,
          expected_delivery: input.expected_delivery,
          assigned_tailor: input.assigned_tailor,
          total_amount: total,
          created_by: uid,
        })
        .select()
        .single();
      if (error) throw error;

      const items = input.items.map((it) => ({
        ...stripRate(it),
        order_id: order.id,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(items);
      if (iErr) throw iErr;

      return { id: order.id, order: order as Order };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", res.id] });
      qc.invalidateQueries({ queryKey: ["fabrics"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Advance/set an order's stage; logs history (trigger) + fires WhatsApp. */
export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      order,
      stage,
    }: {
      order: OrderFull;
      stage: number;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ current_stage: stage })
        .eq("id", order.id);
      if (error) throw error;
      await notifyStageChange(order, stage);
      return stage;
    },
    onSuccess: (_stage, { order }) => {
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Update the outsourced button-hole given/returned counts. */
export function useUpdateButtonhole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      given,
      returned,
    }: {
      orderId: string;
      given: number | null;
      returned: number | null;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ buttonhole_given: given, buttonhole_returned: returned })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_v, { orderId }) => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

// Re-export so components can compute a line's cloth amount consistently.
export { clothAmount };
