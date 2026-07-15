import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserCog, Power, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Profile, Role } from "@/lib/database.types";
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  type CreateStaffInput,
} from "./api";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner / Admin",
  staff: "Staff",
};

const EMPTY: CreateStaffInput = {
  username: "",
  password: "",
  full_name: "",
  role: "staff",
  designation: "",
  monthly_salary: 0,
};

export function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateStaffInput>(EMPTY);
  const [editing, setEditing] = useState<Profile | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-z0-9._-]{2,}$/i.test(form.username.trim())) {
      toast.error("Username: 2+ chars (letters, numbers, . _ -)");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be 6+ characters");
      return;
    }
    try {
      await create.mutateAsync(form);
      toast.success("Staff account created");
      setOpen(false);
      setForm(EMPTY);
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
        description="Add staff (username login), set their job title and salary"
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
          {staff.map((s) => {
            const isOwnerRow = s.role === "owner";
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {s.full_name || "(no name)"}
                      </p>
                      {s.username && (
                        <Badge variant="secondary">@{s.username}</Badge>
                      )}
                      {!s.active && <Badge variant="muted">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_LABEL[s.role]}
                      {s.designation ? ` · ${s.designation}` : ""}
                      {s.monthly_salary
                        ? ` · ${formatCurrency(s.monthly_salary)}/mo`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Edit staff"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil />
                    </Button>
                    {/* Owner rows can't be role-changed or deactivated —
                        prevents locking yourself out of the shop. */}
                    {!isOwnerRow && (
                      <>
                        <Select
                          className="w-40"
                          value={s.role}
                          onChange={(e) =>
                            changeRole(s.id, e.target.value as Role)
                          }
                        >
                          <option value="staff">Staff</option>
                          <option value="owner">Owner / Admin</option>
                        </Select>
                        <Button
                          variant={s.active ? "outline" : "default"}
                          size="icon"
                          aria-label={s.active ? "Deactivate" : "Reactivate"}
                          onClick={() => toggleActive(s.id, s.active)}
                        >
                          <Power />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create staff */}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-username">Username *</Label>
              <Input
                id="s-username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. ravi"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
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
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Staff log in with their username + this password (they can change it
            later).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-desig">Job title / designation</Label>
              <Input
                id="s-desig"
                placeholder="e.g. Cutter, Tailor, Ironing"
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-salary">Monthly salary (₹)</Label>
              <Input
                id="s-salary"
                type="number"
                inputMode="decimal"
                value={form.monthly_salary || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthly_salary: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
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
              <option value="staff">Staff</option>
              <option value="owner">Owner / Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit staff (name / designation / salary) */}
      <EditStaffDialog
        staff={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await update.mutateAsync({ id: editing.id, ...patch });
            toast.success("Staff updated");
            setEditing(null);
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
    </div>
  );
}

function EditStaffDialog({
  staff,
  onClose,
  onSave,
}: {
  staff: Profile | null;
  onClose: () => void;
  onSave: (patch: {
    full_name: string;
    designation: string | null;
    monthly_salary: number;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [salary, setSalary] = useState(0);

  // Re-seed local state when a new staff member is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (staff && seededFor !== staff.id) {
    setFullName(staff.full_name);
    setDesignation(staff.designation ?? "");
    setSalary(staff.monthly_salary);
    setSeededFor(staff.id);
  }

  return (
    <Dialog
      open={!!staff}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setSeededFor(null);
        }
      }}
      title="Edit Staff"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="e-name">Full name</Label>
          <Input
            id="e-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-desig">Job title / designation</Label>
            <Input
              id="e-desig"
              placeholder="e.g. Cutter, Ironing"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-salary">Monthly salary (₹)</Label>
            <Input
              id="e-salary"
              type="number"
              inputMode="decimal"
              value={salary || ""}
              onChange={(e) => setSalary(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        {staff?.username && (
          <p className="text-xs text-muted-foreground">
            Login username: <span className="font-medium">@{staff.username}</span>
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                full_name: fullName,
                designation: designation.trim() || null,
                monthly_salary: salary,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
