import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PaymentMode, SalaryPayment } from "@/lib/database.types";

/** First-of-month date string (YYYY-MM-01) for a given year+month (1-based). */
export function periodKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-01`;
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** All salary payments for a single month (first-of-month period). */
export function useSalaryForPeriod(period: string) {
  return useQuery({
    queryKey: ["salary", "period", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_payments")
        .select("*")
        .eq("period", period);
      if (error) throw error;
      return data as SalaryPayment[];
    },
  });
}

/** All salary payments across a calendar year (for the yearly report). */
export function useSalaryForYear(year: number) {
  return useQuery({
    queryKey: ["salary", "year", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_payments")
        .select("*")
        .gte("period", `${year}-01-01`)
        .lte("period", `${year}-12-01`);
      if (error) throw error;
      return data as SalaryPayment[];
    },
  });
}

export interface RecordSalaryInput {
  staff_id: string;
  period: string;
  amount: number;
  mode: PaymentMode;
  note?: string | null;
}

/** Record (or update) a staff member's salary payment for a month. */
export function useRecordSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordSalaryInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("salary_payments")
        .upsert(
          {
            ...input,
            paid_at: new Date().toISOString(),
            created_by: userData.user?.id ?? null,
          },
          { onConflict: "staff_id,period" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as SalaryPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}

/** Undo a recorded salary payment (mark as unpaid). */
export function useDeleteSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("salary_payments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary"] }),
  });
}
