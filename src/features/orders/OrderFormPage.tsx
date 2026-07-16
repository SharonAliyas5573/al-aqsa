import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomer, useCustomers } from "@/features/customers/api";
import { CustomerFormDialog } from "@/features/customers/CustomerFormDialog";
import { useFabrics } from "@/features/inventory/api";
import { formatCurrency } from "@/lib/utils";
import { OrderItemForm } from "./OrderItemForm";
import {
  computeOrderTotal,
  useOrder,
  useSaveOrder,
  type OrderItemInput,
} from "./api";

function newItem(): OrderItemInput {
  return {
    garment_type_id: null,
    garment_model_id: null,
    quantity: 1,
    fabric_id: null,
    fabric_metres: null,
    colour: null,
    stitch_note: null,
    stitch_amount: 0,
    measurements: {},
    design_notes: null,
  };
}

export function OrderFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
  const [search, setSearch] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [delivery, setDelivery] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([newItem()]);

  const { data: results } = useCustomers(search);
  const { data: selectedCustomer } = useCustomer(customerId || undefined);
  const { data: fabrics } = useFabrics();
  const save = useSaveOrder();
  const { data: existing } = useOrder(id);

  // Populate when editing an existing order.
  useEffect(() => {
    if (existing) {
      setCustomerId(existing.customer_id);
      setDelivery(existing.expected_delivery ?? "");
      setItems(
        existing.items.map((it) => ({
          garment_type_id: it.garment_type_id,
          garment_model_id: it.garment_model_id,
          quantity: it.quantity,
          fabric_id: it.fabric_id,
          fabric_metres: it.fabric_metres,
          colour: it.colour,
          stitch_note: it.stitch_note,
          stitch_amount: it.stitch_amount,
          measurements: it.measurements ?? {},
          design_notes: it.design_notes,
        })),
      );
    }
  }, [existing]);

  const rate = (fabricId: string | null) =>
    fabrics?.find((f) => f.id === fabricId)?.rate_per_metre ?? 0;

  const itemsWithRate = useMemo(
    () => items.map((it) => ({ ...it, fabric_rate: rate(it.fabric_id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, fabrics],
  );

  const clothTotal = itemsWithRate.reduce(
    (s, it) => s + (it.fabric_metres ?? 0) * it.quantity * it.fabric_rate,
    0,
  );
  const stitchTotal = items.reduce((s, it) => s + (it.stitch_amount || 0), 0);
  const grandTotal = computeOrderTotal(itemsWithRate);

  function updateItem(i: number, patch: Partial<OrderItemInput>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    if (!items.every((it) => it.garment_type_id)) {
      toast.error("Pick a garment type for each item");
      return;
    }
    try {
      const res = await save.mutateAsync({
        id,
        customer_id: customerId,
        expected_delivery: delivery || null,
        // Assignment is managed outside this form; preserve whatever is set.
        assigned_tailor: existing?.assigned_tailor ?? null,
        items: itemsWithRate,
      });
      toast.success(editing ? "Order updated" : "Order created");
      navigate(`/orders/${res.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <Link
        to={editing ? `/orders/${id}` : "/orders"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>
      <PageHeader title={editing ? "Edit Order" : "New Order"} />

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.phone}
                  </p>
                </div>
                {!editing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerId("")}
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search name or phone…"
                      className="pl-11"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddCustomerOpen(true)}
                  >
                    <UserPlus /> New
                  </Button>
                </div>
                {search.trim() && (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {(results ?? []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(c.id);
                          setSearch("");
                        }}
                        className="flex w-full items-center justify-between rounded-md border p-3 text-left active:bg-accent"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {c.phone}
                        </span>
                      </button>
                    ))}
                    {results && results.length === 0 && (
                      <p className="p-2 text-sm text-muted-foreground">
                        No match. Tap “New” to add this customer.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Order details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="o-delivery">Due date</Label>
              <Input
                id="o-delivery"
                type="date"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setItems((p) => [...p, newItem()])}
            >
              <Plus /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((it, i) => (
              <OrderItemForm
                key={i}
                index={i}
                item={it}
                customerId={customerId}
                fabrics={fabrics}
                onChange={(patch) => updateItem(i, patch)}
                onRemove={
                  items.length > 1
                    ? () => setItems((p) => p.filter((_, idx) => idx !== i))
                    : undefined
                }
              />
            ))}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
            <Total label="Cloth" value={clothTotal} />
            <Total label="Stitching" value={stitchTotal} />
            <Total label="Grand total" value={grandTotal} highlight />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to={editing ? `/orders/${id}` : "/orders"}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Create order"}
          </Button>
        </div>
      </form>

      <CustomerFormDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        defaultPhone={search.replace(/[^\d+]/g, "").length >= 6 ? search : undefined}
        onSaved={(c) => {
          setCustomerId(c.id);
          setSearch("");
        }}
      />
    </div>
  );
}

function Total({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
