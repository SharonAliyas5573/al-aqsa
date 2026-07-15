import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserCog, Power } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/database.types";
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  type CreateStaffInput,
} from "./api";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner / Admin",
  counter: "Counter Staff",
  tailor: "Tailor",
};

export function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateStaffInput>({
    email: "",
    password: "",
    full_name: "",
    role: "counter",
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      toast.error("Email and a 6+ character password are required");
      return;
    }
    try {
      await create.mutateAsync(form);
      toast.success("Staff account created");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "counter" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await update.mutateAsync({ id, active: !active });
      toast.success(active ? "Deactivated" : "Reactivated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function changeRole(id: string, role: Role) {
    try {
      await update.mutateAsync({ id, role });
      toast.success("Role updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Invite staff and manage roles"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add Staff
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !staff || staff.length === 0 ? (
        <EmptyState icon={UserCog} title="No staff yet" />
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {s.full_name || "(no name)"}
                    </p>
                    {!s.active && <Badge variant="muted">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_LABEL[s.role]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-44"
                    value={s.role}
                    onChange={(e) => changeRole(s.id, e.target.value as Role)}
                  >
                    <option value="owner">Owner / Admin</option>
                    <option value="counter">Counter Staff</option>
                    <option value="tailor">Tailor</option>
                  </Select>
                  <Button
                    variant={s.active ? "outline" : "default"}
                    size="icon"
                    aria-label={s.active ? "Deactivate" : "Reactivate"}
                    onClick={() => toggleActive(s.id, s.active)}
                  >
                    <Power />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Add Staff">
        <form onSubmit={onCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full name</Label>
            <Input
              id="s-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email *</Label>
            <Input
              id="s-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-pass">Temporary password *</Label>
            <Input
              id="s-pass"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Share this with the staff member; they can change it later.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-role">Role *</Label>
            <Select
              id="s-role"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as Role })
              }
            >
              <option value="counter">Counter Staff</option>
              <option value="tailor">Tailor</option>
              <option value="owner">Owner / Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
