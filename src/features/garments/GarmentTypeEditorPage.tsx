import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { MeasurementField, MeasurementInput } from "@/lib/database.types";
import { ModelCardManager } from "./ModelCardManager";
import {
  useDeleteMeasurementField,
  useGarmentTypeFull,
  useReorderMeasurementFields,
  useSaveGarmentType,
  useSaveMeasurementField,
} from "./api";

const INPUT_LABELS: Record<MeasurementInput, string> = {
  number: "Number",
  model_number: "Model + number",
  model: "Model only",
  text: "Text",
};

/** true when this field type carries selectable model photo cards. */
function fieldHasModels(t: MeasurementInput) {
  return t === "model" || t === "model_number";
}

function slugify(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `field_${Date.now()}`
  );
}

export function GarmentTypeEditorPage() {
  const { id } = useParams();
  const { data: garment, isLoading } = useGarmentTypeFull(id);
  const saveType = useSaveGarmentType();
  const saveField = useSaveMeasurementField();
  const delField = useDeleteMeasurementField();
  const reorderFields = useReorderMeasurementFields();

  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<MeasurementInput>("number");
  const [fieldUnit, setFieldUnit] = useState<string>("cm");

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!garment) return <p>Garment type not found.</p>;

  async function addField() {
    const label = fieldLabel.trim();
    if (!label) {
      toast.error("Field label is required");
      return;
    }
    const existingKeys = new Set(garment!.fields.map((f) => f.key));
    let key = slugify(label);
    let n = 2;
    while (existingKeys.has(key)) key = `${slugify(label)}_${n++}`;
    try {
      await saveField.mutateAsync({
        garment_type_id: garment!.id,
        key,
        label,
        input_type: fieldType,
        unit: fieldType === "model" || fieldType === "text" ? null : fieldUnit || null,
        required: false,
        sort_order: garment!.fields.length,
      });
      setFieldLabel("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  /**
   * Move a field one slot up (-1) or down (+1). Rewrites sort_order across the
   * whole list, since rows predating reordering can share or skip values.
   */
  async function moveField(index: number, direction: -1 | 1) {
    const fields = garment!.fields;
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const ids = fields.map((f) => f.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorderFields.mutateAsync({ garment_type_id: garment!.id, ids });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleActive() {
    await saveType.mutateAsync({ id: garment!.id, active: !garment!.active });
  }

  async function renameType() {
    const name = window.prompt("Garment type name", garment!.name)?.trim();
    if (!name || name === garment!.name) return;
    await saveType.mutateAsync({ id: garment!.id, name });
  }

  const modelBearingFields = garment.fields.filter((f) =>
    fieldHasModels(f.input_type),
  );

  return (
    <div>
      <Link
        to="/settings/garments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to garment types
      </Link>
      <PageHeader
        title={garment.name}
        description={garment.active ? "Active" : "Inactive"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={renameType}>
              Rename
            </Button>
            <Button variant="outline" onClick={toggleActive}>
              {garment.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Garment-level model cards */}
        <Card>
          <CardHeader>
            <CardTitle>Garment Models</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelCardManager
              garmentTypeId={garment.id}
              fieldId={null}
              models={garment.models}
              title={`${garment.name} models (photo cards the customer picks from)`}
            />
          </CardContent>
        </Card>

        {/* Measurement fields */}
        <Card>
          <CardHeader>
            <CardTitle>Measurement Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {garment.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No fields yet. Add measurement fields below (e.g. Length,
                Shoulder as Number; Neck, Collar as Model + number).
              </p>
            )}
            <ul className="divide-y">
              {garment.fields.map((f, i) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  isFirst={i === 0}
                  isLast={i === garment.fields.length - 1}
                  reordering={reorderFields.isPending}
                  onMoveUp={() => moveField(i, -1)}
                  onMoveDown={() => moveField(i, 1)}
                  onDelete={() =>
                    delField.mutate({ id: f.id, garment_type_id: garment.id })
                  }
                  onToggleRequired={() =>
                    saveField.mutate({
                      id: f.id,
                      garment_type_id: garment.id,
                      required: !f.required,
                    })
                  }
                />
              ))}
            </ul>

            {/* Add field */}
            <div className="grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_auto_auto_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="new-field">Field label</Label>
                <Input
                  id="new-field"
                  placeholder="e.g. Neck"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addField()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-field-type">Type</Label>
                <Select
                  id="new-field-type"
                  value={fieldType}
                  onChange={(e) =>
                    setFieldType(e.target.value as MeasurementInput)
                  }
                >
                  {(
                    Object.keys(INPUT_LABELS) as MeasurementInput[]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {INPUT_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-field-unit">Unit</Label>
                <Select
                  id="new-field-unit"
                  value={fieldUnit}
                  onChange={(e) => setFieldUnit(e.target.value)}
                  disabled={fieldType === "model" || fieldType === "text"}
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="">—</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addField} className="w-full">
                  <Plus /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-field model cards for model-bearing fields */}
        {modelBearingFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Field Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {modelBearingFields.map((f) => (
                <ModelCardManager
                  key={f.id}
                  garmentTypeId={garment.id}
                  fieldId={f.id}
                  models={garment.models}
                  title={`${f.label} models`}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  isFirst,
  isLast,
  reordering,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleRequired,
}: {
  field: MeasurementField;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onToggleRequired: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          aria-label={`Move ${field.label} up`}
          onClick={onMoveUp}
          disabled={isFirst || reordering}
          className="flex size-8 items-center justify-center rounded text-muted-foreground active:bg-accent disabled:opacity-30"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${field.label} down`}
          onClick={onMoveDown}
          disabled={isLast || reordering}
          className="flex size-8 items-center justify-center rounded text-muted-foreground active:bg-accent disabled:opacity-30"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {field.label}
          {field.unit ? ` (${field.unit})` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {INPUT_LABELS[field.input_type]}
          {field.required ? " · required" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleRequired}
        className="rounded px-2 py-1 text-xs text-muted-foreground active:bg-accent"
      >
        {field.required ? "Required" : "Optional"}
      </button>
      <button
        type="button"
        aria-label="Delete field"
        onClick={onDelete}
        className="flex size-9 items-center justify-center rounded text-destructive active:bg-accent"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
