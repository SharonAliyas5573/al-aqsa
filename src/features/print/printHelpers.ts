import type {
  FieldModel,
  MeasurementField,
  MeasurementValue,
} from "@/lib/database.types";

/**
 * Print exactly one hidden `.print-doc` node by id. Adds `.printing` to it,
 * calls window.print(), then removes the class. Combined with the print CSS in
 * index.css this reveals only the chosen receipt (cloth bill / stitch bill /
 * job order).
 */
export function printNode(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("printing");
  const cleanup = () => {
    el.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Fallback in case afterprint doesn't fire (some Android print flows).
  setTimeout(cleanup, 1500);
}

/** Look up a model's name by id from a flat models list. */
export function modelName(
  models: FieldModel[] | undefined,
  modelId: string | null,
): string | null {
  if (!modelId || !models) return null;
  return models.find((m) => m.id === modelId)?.name ?? null;
}

/** Human string for one captured measurement value (e.g. "42 · Round"). */
export function formatMeasurement(
  field: MeasurementField,
  value: MeasurementValue | undefined,
  models: FieldModel[] | undefined,
): string {
  if (!value) return "—";
  const parts: string[] = [];
  if (value.value != null)
    parts.push(`${value.value}${field.unit ? ` ${field.unit}` : ""}`);
  const mName = modelName(models, value.model_id);
  if (mName) parts.push(mName);
  if (value.note) parts.push(value.note);
  return parts.length ? parts.join(" · ") : "—";
}
