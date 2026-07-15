import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Customer,
  CustomerMeasurement,
  MeasurementValues,
} from "@/lib/database.types";

export function useCustomers(search: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},phone.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

/** All customers sharing an exact phone number (the "people on this number"). */
export function useCustomersByPhone(phone: string | undefined) {
  return useQuery({
    queryKey: ["customers", "phone", phone],
    enabled: !!phone,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone!)
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

// ---------------------------------------------------------------------------
// Per-(customer, garment type) measurement sets
// ---------------------------------------------------------------------------

/** All saved measurement sets for a customer (one per garment type). */
export function useCustomerMeasurements(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_measurements", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_measurements")
        .select("*")
        .eq("customer_id", customerId!);
      if (error) throw error;
      return data as CustomerMeasurement[];
    },
  });
}

/** One saved set for a customer + garment type (null if none yet). */
export function useCustomerMeasurement(
  customerId: string | undefined,
  garmentTypeId: string | undefined,
) {
  return useQuery({
    queryKey: ["customer_measurement", customerId, garmentTypeId],
    enabled: !!customerId && !!garmentTypeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_measurements")
        .select("*")
        .eq("customer_id", customerId!)
        .eq("garment_type_id", garmentTypeId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CustomerMeasurement) ?? null;
    },
  });
}

export function useSaveCustomerMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      garment_type_id: string;
      values: MeasurementValues;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("customer_measurements")
        .upsert(
          { ...input, updated_at: new Date().toISOString() },
          { onConflict: "customer_id,garment_type_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as CustomerMeasurement;
    },
    onSuccess: (m) => {
      qc.invalidateQueries({
        queryKey: ["customer_measurements", m.customer_id],
      });
      qc.invalidateQueries({
        queryKey: ["customer_measurement", m.customer_id, m.garment_type_id],
      });
    },
  });
}

export type CustomerInput = Omit<Customer, "id" | "created_at">;

export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("customers")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Customer;
      }
      const { data, error } = await supabase
        .from("customers")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", c.id] });
    },
  });
}
