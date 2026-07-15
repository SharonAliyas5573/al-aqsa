import { useEffect } from "react";
import { Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DynamicMeasurementForm,
  emptyValues,
  normalizeValues,
} from "@/features/measurements/DynamicMeasurementForm";
import { ModelPicker } from "@/features/measurements/ModelPicker";
import { useGarmentTypeFull, useGarmentTypes } from "@/features/garments/api";
import { useCustomerMeasurement } from "@/features/customers/api";
import { formatCurrency } from "@/lib/utils";
import type { Fabric } from "@/lib/database.types";
import type { OrderItemInput } from "./api";

interface Props {
  index: number;
  item: OrderItemInput;
  customerId: string;
  fabrics: Fabric[] | undefined;
  onChange: (patch: Partial<OrderItemInput>) => void;
  onRemove?: () => void;
}

/**
 * One order line: garment type → garment model card → dynamic measurements
 * (auto-filled from the customer's saved set) → cloth (fabric + metres, cloth
 * amount auto-calculated from the fabric rate) → stitch note + amount.
 */
export function OrderItemForm({
  index,
  item,
  customerId,
  fabrics,
  onChange,
  onRemove,
}: Props) {
  const { data: garmentTypes } = useGarmentTypes(true);
  const { data: garment } = useGarmentTypeFull(
    item.garment_type_id || undefined,
  );
  const { data: savedSet } = useCustomerMeasurement(
    customerId || undefined,
    item.garment_type_id || undefined,
  );

  const fabric = fabrics?.find((f) => f.id === item.fabric_id) ?? null;
  const rate = fabric?.rate_per_metre ?? 0;
  const cloth = (item.fabric_metres ?? 0) * item.quantity * rate;

  // Garment-level model cards (field_id === null).
  const garmentModels = (garment?.models ?? []).filter(
    (m) => m.field_id === null,
  );

  // When the garment type changes, seed measurements from the saved set.
  useEffect(() => {
    if (!garment) return;
    // Only seed if the current measurements are empty (fresh line / type switch).
    const hasAny = Object.values(item.measurements ?? {}).some(
      (v) => v.value != null || v.model_id != null || v.note,
    );
    if (!hasAny) {
      onChange({
        measurements: normalizeValues(
          garment.fields,
          savedSet?.values ?? null,
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garment?.id, savedSet]);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">Item {index + 1}</p>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={onRemove}
          >
            <Trash2 /> Remove
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Garment type + quantity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Garment type *</Label>
            <Select
              value={item.garment_type_id ?? ""}
              onChange={(e) =>
                onChange({
                  garment_type_id: e.target.value || null,
                  garment_model_id: null,
                  measurements: {},
                })
              }
            >
              <option value="">Select…</option>
              {garmentTypes?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                onChange({ quantity: Math.max(1, Number(e.target.value)) })
              }
            />
          </div>
        </div>

        {/* Garment model photo cards */}
        {garmentModels.length > 0 && (
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelPicker
              models={garmentModels}
              value={item.garment_model_id}
              onChange={(id) => onChange({ garment_model_id: id })}
            />
          </div>
        )}

        {/* Dynamic measurements */}
        {garment && garment.fields.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Ruler className="size-4" /> Measurements
            </Label>
            <DynamicMeasurementForm
              garment={garment}
              values={
                Object.keys(item.measurements ?? {}).length
                  ? item.measurements
                  : emptyValues(garment.fields)
              }
              onChange={(measurements) => onChange({ measurements })}
            />
          </div>
        )}

        {/* Cloth */}
        <div className="rounded-md bg-muted/40 p-3">
          <p className="mb-3 text-sm font-medium">Cloth</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Fabric</Label>
              <Select
                value={item.fabric_id ?? ""}
                onChange={(e) =>
                  onChange({ fabric_id: e.target.value || null })
                }
              >
                <option value="">None</option>
                {fabrics?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.colour ? ` (${f.colour})` : ""} — ₹{f.rate_per_metre}/m ·{" "}
                    {f.stock_metres}m
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Metres / unit</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g. 3.5"
                value={item.fabric_metres ?? ""}
                onChange={(e) =>
                  onChange({
                    fabric_metres:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                disabled={!item.fabric_id}
              />
            </div>
          </div>
          {item.fabric_id && (
            <p className="mt-2 text-sm text-muted-foreground">
              Cloth: {item.fabric_metres ?? 0}m × {item.quantity} × ₹{rate} ={" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(cloth)}
              </span>
            </p>
          )}
        </div>

        {/* Stitching */}
        <div className="rounded-md bg-muted/40 p-3">
          <p className="mb-3 text-sm font-medium">Stitching</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>What to stitch</Label>
              <Textarea
                placeholder="e.g. Kandhura with side pockets, hidden buttons"
                value={item.stitch_note ?? ""}
                onChange={(e) =>
                  onChange({ stitch_note: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stitch charge (₹)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={item.stitch_amount || ""}
                onChange={(e) =>
                  onChange({ stitch_amount: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
