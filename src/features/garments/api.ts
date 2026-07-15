import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  FieldModel,
  GarmentType,
  GarmentTypeFull,
  MeasurementField,
} from "@/lib/database.types";

const MODEL_BUCKET = "model-photos";

// ---------------------------------------------------------------------------
// Garment types
// ---------------------------------------------------------------------------

/** All garment types (optionally only active ones), ordered for display. */
export function useGarmentTypes(activeOnly = false) {
  return useQuery({
    queryKey: ["garment_types", { activeOnly }],
    queryFn: async () => {
      let q = supabase
        .from("garment_types")
        .select("*")
        .order("sort_order")
        .order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as GarmentType[];
    },
  });
}

/** A garment type with its measurement fields and every model option. */
export function useGarmentTypeFull(id: string | undefined) {
  return useQuery({
    queryKey: ["garment_type", id],
    enabled: !!id,
    queryFn: async () => {
      const [type, fields, models] = await Promise.all([
        supabase.from("garment_types").select("*").eq("id", id!).single(),
        supabase
          .from("measurement_fields")
          .select("*")
          .eq("garment_type_id", id!)
          .order("sort_order"),
        supabase
          .from("field_models")
          .select("*")
          .eq("garment_type_id", id!)
          .order("sort_order"),
      ]);
      if (type.error) throw type.error;
      if (fields.error) throw fields.error;
      if (models.error) throw models.error;
      return {
        ...(type.data as GarmentType),
        fields: fields.data as MeasurementField[],
        models: models.data as FieldModel[],
      } satisfies GarmentTypeFull;
    },
  });
}

export type GarmentTypeInput = Pick<
  GarmentType,
  "name" | "active" | "sort_order"
>;

export function useSaveGarmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<GarmentTypeInput> & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("garment_types")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as GarmentType;
      }
      const { data, error } = await supabase
        .from("garment_types")
        .insert({ name: input.name ?? "", sort_order: input.sort_order ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return data as GarmentType;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["garment_types"] });
      qc.invalidateQueries({ queryKey: ["garment_type", t.id] });
    },
  });
}

export function useDeleteGarmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("garment_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["garment_types"] }),
  });
}

// ---------------------------------------------------------------------------
// Measurement fields
// ---------------------------------------------------------------------------

export type MeasurementFieldInput = Omit<
  MeasurementField,
  "id" | "created_at"
>;

export function useSaveMeasurementField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<MeasurementFieldInput> & {
        id?: string;
        garment_type_id: string;
      },
    ) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("measurement_fields")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as MeasurementField;
      }
      const { data, error } = await supabase
        .from("measurement_fields")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as MeasurementField;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["garment_type", f.garment_type_id] });
    },
  });
}

export function useDeleteMeasurementField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; garment_type_id: string }) => {
      const { error } = await supabase
        .from("measurement_fields")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, { garment_type_id }) =>
      qc.invalidateQueries({ queryKey: ["garment_type", garment_type_id] }),
  });
}

// ---------------------------------------------------------------------------
// Field models (photo cards) + photo upload
// ---------------------------------------------------------------------------

export type FieldModelInput = Omit<FieldModel, "id" | "created_at">;

/** Upload a model photo to the model-photos bucket; returns the storage key. */
export async function uploadModelPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MODEL_BUCKET)
    .upload(key, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return key;
}

/** Public URL for a model photo storage key (null passes through). */
export function modelPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(MODEL_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function useSaveFieldModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<FieldModelInput> & {
        id?: string;
        garment_type_id: string;
      },
    ) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("field_models")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as FieldModel;
      }
      const { data, error } = await supabase
        .from("field_models")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as FieldModel;
    },
    onSuccess: (m) =>
      qc.invalidateQueries({ queryKey: ["garment_type", m.garment_type_id] }),
  });
}

export function useDeleteFieldModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; garment_type_id: string }) => {
      const { error } = await supabase
        .from("field_models")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, { garment_type_id }) =>
      qc.invalidateQueries({ queryKey: ["garment_type", garment_type_id] }),
  });
}
