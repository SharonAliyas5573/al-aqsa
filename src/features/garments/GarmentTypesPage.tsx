import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Shirt, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGarmentTypes, useSaveGarmentType } from "./api";

export function GarmentTypesPage() {
  const { data: types, isLoading } = useGarmentTypes();
  const save = useSaveGarmentType();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function create() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), sort_order: types?.length ?? 0 });
      toast.success("Garment type created");
      setName("");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Garment Types"
        description="Define each garment you stitch, its measurement fields and model photo cards"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New Garment Type
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !types || types.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="No garment types yet"
          description="Start by creating a garment type (e.g. Kandhura), then add its measurement fields and model cards."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> New Garment Type
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => (
            <Link key={t.id} to={`/settings/garments/${t.id}`}>
              <Card className="transition active:bg-accent">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <Shirt className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    {!t.active && (
                      <Badge variant="secondary" className="mt-1">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="New Garment Type">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gt-name">Name *</Label>
            <Input
              id="gt-name"
              placeholder="e.g. Kandhura, Shirt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={save.isPending}>
              {save.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
