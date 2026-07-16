import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/database.types";

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** Active staff, for the order assignment dropdown (was "tailors"). */
export function useTailors() {
  const q = useStaff();
  return {
    ...q,
    data: (q.data ?? []).filter((p) => p.role === "staff" && p.active),
  };
}

export interface CreateStaffInput {
  username: string;
  password: string;
  full_name: string;
  role: Role;
  designation: string;
  monthly_salary: number;
}

/** Calls the create-staff Edge Function (owner-only, uses service role). */
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const { data, error } = await supabase.functions.invoke("create-staff", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

/** Owner can update role / active status directly (RLS allows owner writes). */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      role?: Role;
      active?: boolean;
      full_name?: string;
      designation?: string | null;
      monthly_salary?: number;
      /** Stage numbers this staff member may set; null = all stages. */
      allowed_stages?: number[] | null;
    }) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("profiles")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}
