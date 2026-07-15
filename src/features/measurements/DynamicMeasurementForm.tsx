import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  FieldModel,
  GarmentTypeFull,
  MeasurementField,
  MeasurementValue,
  MeasurementValues,
} from "@/lib/database.types";
import { ModelPicker } from "./ModelPicker";

const EMPTY_VALUE: MeasurementValue = { value: null, model_id: null, note: null };

/** Build an empty values map for every field of a garment type. */
export function emptyValues(fields: MeasurementField[]): MeasurementValues {
  const out: MeasurementValues = {};
  for (const f of fields) out[f.key] = { ...EMPTY_VALUE };
  return out;
}

/** Ensure every field key exists (used when loading a saved/older set). */
export function normalizeValues(
  fields: MeasurementField[],
  values: MeasurementValues | null | undefined,
): MeasurementValues {
  const base = emptyValues(fields);
  if (!values) return base;
  for (const f of fields) {
    if (values[f.key]) base[f.key] = { ...EMPTY_VALUE, ...values[f.key] };
  }
  return base;
}

interface Props {
  garment: GarmentTypeFull;
  values: MeasurementValues;
  onChange: (values: MeasurementValues) => void;
  disabled?: boolean;
}

/**
 * Renders a garment type's measurement fields dynamically: number inputs for
 * plain fields, a photo-card ModelPicker for model / model_number fields (plus
 * a number for model_number), and text areas for text fields. Kiosk-friendly.
 */
export function DynamicMeasurementForm({
  garment,
  values,
  onChange,
  disabled,
}: Props) {
  const fields = [...garment.fields].sort((a, b) => a.sort_order - b.sort_order);

  function setField(key: string, patch: Partial<MeasurementValue>) {
    onChange({
      ...values,
      [key]: { ...EMPTY_VALUE, ...values[key], ...patch },
    });
  }

  function modelsFor(field: MeasurementField): FieldModel[] {
    return garment.models.filter((m) => m.field_id === field.id);
  }

  return (
    <div className="space-y-5">
      {fields.map((f) => {
        const v = values[f.key] ?? EMPTY_VALUE;
        const showModel = f.input_type === "model" || f.input_type === "model_number";
        const showNumber = f.input_type === "number" || f.input_type === "model_number";
        const showText = f.input_type === "text";

        return (
          <div key={f.id} className="space-y-2">
            <Label>
              {f.label}
              {f.unit ? ` (${f.unit})` : ""}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>

            {showModel && (
              <ModelPicker
                models={modelsFor(f)}
                value={v.model_id}
                onChange={(model_id) => setField(f.key, { model_id })}
                disabled={disabled}
              />
            )}

            {showNumber && (
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                disabled={disabled}
                value={v.value ?? ""}
                placeholder={showModel ? "Measurement" : undefined}
                onChange={(e) =>
                  setField(f.key, {
                    value: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            )}

            {showText && (
              <Textarea
                disabled={disabled}
                value={v.note ?? ""}
                onChange={(e) =>
                  setField(f.key, { note: e.target.value || null })
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
