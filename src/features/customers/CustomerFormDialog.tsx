import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@/lib/database.types";
import { useSaveCustomer, type CustomerInput } from "./api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer?: Customer | null;
  /** Prefill the phone for a new person on an existing number. */
  defaultPhone?: string;
  onSaved?: (c: Customer) => void;
}

const EMPTY: CustomerInput = {
  name: "",
  phone: "",
  whatsapp_number: null,
  address: null,
  notes: null,
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  defaultPhone,
  onSaved,
}: Props) {
  const save = useSaveCustomer();
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [sameWa, setSameWa] = useState(true);

  useEffect(() => {
    if (open) {
      if (customer) {
        setForm({
          name: customer.name,
          phone: customer.phone,
          whatsapp_number: customer.whatsapp_number,
          address: customer.address,
          notes: customer.notes,
        });
        setSameWa(
          !customer.whatsapp_number ||
            customer.whatsapp_number === customer.phone,
        );
      } else {
        setForm({ ...EMPTY, phone: defaultPhone ?? "" });
        setSameWa(true);
      }
    }
  }, [open, customer]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    const payload: CustomerInput = {
      ...form,
      whatsapp_number: sameWa ? form.phone : form.whatsapp_number,
    };
    try {
      const saved = await save.mutateAsync({ ...payload, id: customer?.id });
      toast.success(customer ? "Customer updated" : "Customer added");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? "Edit Customer" : "New Customer"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Name *</Label>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">Phone *</Label>
          <Input
            id="c-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={sameWa}
            onChange={(e) => setSameWa(e.target.checked)}
          />
          WhatsApp number is the same as phone
        </label>
        {!sameWa && (
          <div className="space-y-1.5">
            <Label htmlFor="c-wa">WhatsApp number</Label>
            <Input
              id="c-wa"
              type="tel"
              inputMode="tel"
              value={form.whatsapp_number ?? ""}
              onChange={(e) =>
                setForm({ ...form, whatsapp_number: e.target.value || null })
              }
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="c-address">Address</Label>
          <Textarea
            id="c-address"
            value={form.address ?? ""}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value || null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-notes">Notes</Label>
          <Textarea
            id="c-notes"
            value={form.notes ?? ""}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value || null })
            }
          />
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
