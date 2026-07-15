import { Check, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldModel } from "@/lib/database.types";
import { modelPhotoUrl } from "@/features/garments/api";

interface Props {
  models: FieldModel[];
  value: string | null;
  onChange: (modelId: string | null) => void;
  disabled?: boolean;
}

/**
 * Touch-first photo-card grid for choosing a model (garment style, neck shape…).
 * Tap a card to select; tap again to clear. Kiosk-friendly: large targets, no
 * hover dependence, clear selected ring + check. Falls back to a placeholder
 * tile when a model has no photo yet.
 */
export function ModelPicker({ models, value, onChange, disabled }: Props) {
  const active = models
    .filter((m) => m.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No models set up for this yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {active.map((m) => {
        const url = modelPhotoUrl(m.photo_path);
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? null : m.id)}
            className={cn(
              "group relative overflow-hidden rounded-lg border-2 text-left transition disabled:opacity-50",
              selected
                ? "border-primary ring-2 ring-primary"
                : "border-transparent",
            )}
          >
            <div className="relative aspect-square bg-muted">
              {url ? (
                <img
                  src={url}
                  alt={m.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
              {selected && (
                <div className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" />
                </div>
              )}
            </div>
            <div
              className={cn(
                "truncate px-2 py-1.5 text-center text-sm font-medium",
                selected && "bg-primary/10 text-primary",
              )}
            >
              {m.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
