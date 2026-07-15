import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Fabric } from "@/lib/database.types";
import { useSaveFabric, type FabricInput } from "./api";

const EMPTY: FabricInput = {
  name: "",
  colour: null,
  stock_metres: 0,
  min_threshold: 0,
  rate_per_metre: 0,
  supplier_name: null,
  supplier_contact: null,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fabric?: Fabric | null;
}

export function FabricFormDialog({ open, onOpenChange, fabric }: Props) {
  const save = useSaveFabric();
  const [form, setForm] = useState<FabricInput>(EMPTY);

  useEffect(() => {
    if (open) {
      if (fabric) {
        const { id: _id, created_at: _c, ...rest } = fabric;
        setForm(rest);
      } else setForm(EMPTY);
    }
  }, [open, fabric]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Fabric name is required");
      return;
    }
    try {
      await save.mutateAsync({ ...form, id: fabric?.id });
      toast.success(fabric ? "Fabric updated" : "Fabric added");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={fabric ? "Edit Fabric" : "New Fabric"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="f-name">Fabric name *</Label>
            <Input
              id="f-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-colour">Colour</Label>
            <Input
              id="f-colour"
              value={form.colour ?? ""}
              onChange={(e) =>
                setForm({ ...form, colour: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-stock">Stock (metres)</Label>
            <Input
              id="f-stock"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.stock_metres}
              onChange={(e) =>
                setForm({ ...form, stock_metres: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-min">Low-stock threshold (m)</Label>
            <Input
              id="f-min"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.min_threshold}
              onChange={(e) =>
                setForm({ ...form, min_threshold: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-rate">Rate per metre (₹)</Label>
            <Input
              id="f-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.rate_per_metre}
              onChange={(e) =>
                setForm({ ...form, rate_per_metre: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-sup">Supplier name</Label>
            <Input
              id="f-sup"
              value={form.supplier_name ?? ""}
              onChange={(e) =>
                setForm({ ...form, supplier_name: e.target.value || null })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="f-supc">Supplier contact</Label>
            <Input
              id="f-supc"
              value={form.supplier_contact ?? ""}
              onChange={(e) =>
                setForm({ ...form, supplier_contact: e.target.value || null })
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
