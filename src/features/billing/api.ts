import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  OrderWithCustomer,
  Payment,
  PaymentMode,
} from "@/lib/database.types";

/** Sum paid for an order from its payments array. */
export function paidTotal(payments: Payment[]): number {
  return payments.reduce((s, p) => s + Number(p.amount), 0);
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      amount: number;
      mode: PaymentMode;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").insert({
        ...input,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["order", vars.order_id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Orders with an outstanding balance (owner collections view). */
export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customer:customers(*), payments(amount)")
        .neq("payment_status", "paid")
        .order("expected_delivery", { ascending: true, nullsFirst: false });
      if (error) throw error;
      type Row = OrderWithCustomer & { payments: { amount: number }[] };
      return (data as unknown as Row[]).map((o) => {
        const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
        return { ...o, paid, balance: Number(o.total_amount) - paid };
      });
    },
  });
}
