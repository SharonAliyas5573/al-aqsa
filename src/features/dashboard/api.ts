import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ORDER_STAGES, type OrderWithCustomer } from "@/lib/database.types";

export interface DashboardData {
  activeOrders: number;
  stageCounts: { stage: number; label: string; count: number }[];
  deliveriesToday: OrderWithCustomer[];
  pendingCollectionsTotal: number;
  lowStock: { id: string; name: string; stock_metres: number }[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const today = todayISO();

      // Fetch the pieces in parallel.
      const [ordersRes, deliveriesRes, collectionsRes, fabricsRes] =
        await Promise.all([
          supabase.from("orders").select("current_stage"),
          supabase
            .from("orders")
            .select("*, customer:customers(*)")
            .eq("expected_delivery", today)
            .lt("current_stage", 9),
          supabase
            .from("orders")
            .select("total_amount, payments(amount)")
            .neq("payment_status", "paid"),
          supabase.from("fabrics").select("id, name, stock_metres, min_threshold"),
        ]);

      if (ordersRes.error) throw ordersRes.error;

      const allOrders = ordersRes.data as { current_stage: number }[];
      const activeOrders = allOrders.filter((o) => o.current_stage < 9).length;

      const stageCounts = ORDER_STAGES.map((label, i) => ({
        stage: i + 1,
        label,
        count: allOrders.filter((o) => o.current_stage === i + 1).length,
      }));

      const collections =
        (collectionsRes.data as
          | { total_amount: number; payments: { amount: number }[] }[]
          | null) ?? [];
      const pendingCollectionsTotal = collections.reduce((sum, o) => {
        const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
        return sum + (Number(o.total_amount) - paid);
      }, 0);

      const fabrics =
        (fabricsRes.data as {
          id: string;
          name: string;
          stock_metres: number;
          min_threshold: number;
        }[]) ?? [];
      const lowStock = fabrics.filter(
        (f) => f.stock_metres <= f.min_threshold,
      );

      return {
        activeOrders,
        stageCounts,
        deliveriesToday: (deliveriesRes.data as OrderWithCustomer[]) ?? [],
        pendingCollectionsTotal,
        lowStock,
      };
    },
  });
}
