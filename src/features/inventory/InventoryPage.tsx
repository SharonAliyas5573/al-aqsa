import { useState } from "react";
import { Plus, Package, Pencil, AlertTriangle, Truck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Fabric } from "@/lib/database.types";
import { useFabrics } from "./api";
import { FabricFormDialog } from "./FabricFormDialog";

export function InventoryPage() {
  const { data: fabrics, isLoading } = useFabrics();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fabric | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(f: Fabric) {
    setEditing(f);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Fabric Inventory"
        description="Track stock levels, thresholds and suppliers"
        action={
          <Button onClick={openNew}>
            <Plus /> New Fabric
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !fabrics || fabrics.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No fabrics yet"
          description="Add fabric types to track stock and link them to orders."
          action={
            <Button onClick={openNew}>
              <Plus /> New Fabric
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fabrics.map((f) => {
            const low = f.stock_metres <= f.min_threshold;
            return (
              <Card key={f.id} className={low ? "border-amber-400" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{f.name}</p>
                      {f.colour && (
                        <p className="text-sm text-muted-foreground">
                          {f.colour}
                        </p>
                      )}
                    </div>
                    <button
                      className="flex size-11 items-center justify-center rounded-md active:bg-accent"
                      onClick={() => openEdit(f)}
                      aria-label="Edit fabric"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {f.stock_metres}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      metres in stock
                    </span>
                    {low && (
                      <Badge variant="warning" className="ml-auto gap-1">
                        <AlertTriangle className="size-3" /> Low
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Alert below {f.min_threshold} m · ₹{f.rate_per_metre}/m
                  </p>

                  {f.supplier_name && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Truck className="size-4" /> {f.supplier_name}
                      {f.supplier_contact && ` · ${f.supplier_contact}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FabricFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fabric={editing}
      />
    </div>
  );
}
