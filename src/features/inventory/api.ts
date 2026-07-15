import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Fabric } from "@/lib/database.types";

export function useFabrics() {
  return useQuery({
    queryKey: ["fabrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabrics")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Fabric[];
    },
  });
}

/** Fabrics at or below their minimum threshold. */
export function useLowStockFabrics() {
  const q = useFabrics();
  const low = (q.data ?? []).filter(
    (f) => f.stock_metres <= f.min_threshold,
  );
  return { ...q, data: low };
}

export type FabricInput = Omit<Fabric, "id" | "created_at">;

export function useSaveFabric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FabricInput & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("fabrics")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Fabric;
      }
      const { data, error } = await supabase
        .from("fabrics")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Fabric;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fabrics"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteFabric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fabrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fabrics"] }),
  });
}
