import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldModel } from "@/lib/database.types";
import {
  modelPhotoUrl,
  uploadModelPhoto,
  useDeleteFieldModel,
  useSaveFieldModel,
} from "./api";

interface Props {
  garmentTypeId: string;
  /** null = garment-level models; a field id = that field's models. */
  fieldId: string | null;
  models: FieldModel[];
  /** Short heading e.g. "Garment models" or "Neck models". */
  title: string;
}

/**
 * Manage the photo-card options for one field (or the garment itself). Owner-only
 * screen; touch-first cards with big tap targets. Uploads go to the model-photos
 * bucket. A card = name + optional photo.
 */
export function ModelCardManager({
  garmentTypeId,
  fieldId,
  models,
  title,
}: Props) {
  const save = useSaveFieldModel();
  const del = useDeleteFieldModel();
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const list = models
    .filter((m) => m.field_id === fieldId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function addModel() {
    const name = newName.trim();
    if (!name) {
      toast.error("Model name is required");
      return;
    }
    try {
      await save.mutateAsync({
        garment_type_id: garmentTypeId,
        field_id: fieldId,
        name,
        sort_order: list.length,
        active: true,
      });
      setNewName("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onPhoto(model: FieldModel, file: File | undefined) {
    if (!file) return;
    setUploading(model.id);
    try {
      const path = await uploadModelPhoto(file);
      await save.mutateAsync({
        id: model.id,
        garment_type_id: garmentTypeId,
        photo_path: path,
      });
      toast.success("Photo added");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function rename(model: FieldModel) {
    const name = window.prompt("Model name", model.name)?.trim();
    if (!name || name === model.name) return;
    await save.mutateAsync({
      id: model.id,
      garment_type_id: garmentTypeId,
      name,
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {list.map((m) => {
          const url = modelPhotoUrl(m.photo_path);
          return (
            <div key={m.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-square bg-muted">
                {url ? (
                  <img
                    src={url}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                {uploading === m.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-sm font-medium">{m.name}</span>
                <div className="flex shrink-0">
                  <input
                    ref={(el) => (fileInputs.current[m.id] = el)}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPhoto(m, e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    aria-label="Upload photo"
                    className="flex size-9 items-center justify-center rounded active:bg-accent"
                    onClick={() => fileInputs.current[m.id]?.click()}
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Rename"
                    className="flex size-9 items-center justify-center rounded active:bg-accent"
                    onClick={() => rename(m)}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete model"
                    className="flex size-9 items-center justify-center rounded text-destructive active:bg-accent"
                    onClick={() =>
                      del.mutate({ id: m.id, garment_type_id: garmentTypeId })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`new-model-${fieldId ?? "garment"}`} className="sr-only">
            New model name
          </Label>
          <Input
            id={`new-model-${fieldId ?? "garment"}`}
            placeholder="New model name (e.g. Round, V-neck…)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addModel();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={addModel}>
          Add
        </Button>
      </div>
    </div>
  );
}
