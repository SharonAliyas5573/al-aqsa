import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Wallet, Check, RotateCcw, CalendarDays, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStaff } from "@/features/staff/api";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMode, Profile, SalaryPayment } from "@/lib/database.types";
import {
  MONTH_NAMES,
  periodKey,
  useDeleteSalary,
  useRecordSalary,
  useSalaryForPeriod,
  useSalaryForYear,
} from "./api";

const now = new Date();

export function SalaryPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [view, setView] = useState<"month" | "year">("month");

  const { data: staff } = useStaff();
  // Only real staff (owner excluded — owner has no salary line).
  const staffList = useMemo(
    () => (staff ?? []).filter((s) => s.role === "staff"),
    [staff],
  );

  const years = [year - 2, year - 1, year, year + 1];

  return (
    <div>
      <PageHeader
        title="Salary"
        description="Track monthly staff salary payments and yearly totals"
        action={
          <div className="flex gap-2">
            <Button
              variant={view === "month" ? "default" : "outline"}
              onClick={() => setView("month")}
            >
              <CalendarDays /> Monthly
            </Button>
            <Button
              variant={view === "year" ? "default" : "outline"}
              onClick={() => setView("year")}
            >
              <BarChart3 /> Yearly
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {view === "month" && (
          <div className="w-32">
            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-32">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {staffList.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No staff to pay"
          description="Add staff (with a monthly salary) to track salary payments."
        />
      ) : view === "month" ? (
        <MonthlyView staff={staffList} year={year} month={month} />
      ) : (
        <YearlyView staff={staffList} year={year} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly grid
// ---------------------------------------------------------------------------

function MonthlyView({
  staff,
  year,
  month,
}: {
  staff: Profile[];
  year: number;
  month: number;
}) {
  const period = periodKey(year, month);
  const { data: payments } = useSalaryForPeriod(period);
  const del = useDeleteSalary();
  const [payFor, setPayFor] = useState<Profile | null>(null);

  const byStaff = useMemo(() => {
    const m = new Map<string, SalaryPayment>();
    for (const p of payments ?? []) m.set(p.staff_id, p);
    return m;
  }, [payments]);

  const totalSalary = staff.reduce((s, p) => s + p.monthly_salary, 0);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const paidCount = staff.filter((s) => byStaff.has(s.id)).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Payroll (this month)" value={formatCurrency(totalSalary)} />
        <Summary label="Paid" value={formatCurrency(totalPaid)} />
        <Summary
          label="Pending"
          value={`${staff.length - paidCount} of ${staff.length}`}
          highlight={paidCount < staff.length}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {staff.map((s) => {
              const paid = byStaff.get(s.id);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{s.full_name || "(no name)"}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.designation ? `${s.designation} · ` : ""}
                      {formatCurrency(s.monthly_salary)}/mo
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {paid ? (
                      <>
                        <Badge variant="success" className="gap-1">
                          <Check className="size-3" />
                          Paid {formatCurrency(Number(paid.amount))}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => del.mutate(paid.id)}
                        >
                          <RotateCcw /> Undo
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="muted">Pending</Badge>
                        <Button size="sm" onClick={() => setPayFor(s)}>
                          <Check /> Mark paid
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <MarkPaidDialog
        staff={payFor}
        period={period}
        onClose={() => setPayFor(null)}
      />
    </div>
  );
}

function MarkPaidDialog({
  staff,
  period,
  onClose,
}: {
  staff: Profile | null;
  period: string;
  onClose: () => void;
}) {
  const record = useRecordSalary();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed the amount with the staff member's monthly salary when opened.
  if (staff && seededFor !== staff.id) {
    setAmount(String(staff.monthly_salary || ""));
    setMode("cash");
    setSeededFor(staff.id);
  }

  async function save() {
    if (!staff) return;
    const value = Number(amount);
    if (!value || value < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await record.mutateAsync({
        staff_id: staff.id,
        period,
        amount: value,
        mode,
      });
      toast.success("Salary marked paid");
      onClose();
      setSeededFor(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
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
      title={`Pay salary — ${staff?.full_name ?? ""}`}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sal-amount">Amount (₹)</Label>
          <Input
            id="sal-amount"
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sal-mode">Mode</Label>
          <Select
            id="sal-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={record.isPending}>
            {record.isPending ? "Saving…" : "Mark paid"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Yearly report
// ---------------------------------------------------------------------------

function YearlyView({ staff, year }: { staff: Profile[]; year: number }) {
  const { data: payments } = useSalaryForYear(year);

  // amount[staffId][month0..11]
  const grid = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of staff) m.set(s.id, Array(12).fill(0));
    for (const p of payments ?? []) {
      const monthIdx = new Date(p.period).getUTCMonth();
      const row = m.get(p.staff_id);
      if (row) row[monthIdx] += Number(p.amount);
    }
    return m;
  }, [staff, payments]);

  const monthTotals = Array(12).fill(0);
  for (const row of grid.values())
    row.forEach((v, i) => (monthTotals[i] += v));
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{year} — salary paid per staff</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Staff</th>
              {MONTH_NAMES.map((m) => (
                <th key={m} className="p-2 text-right font-medium">
                  {m}
                </th>
              ))}
              <th className="p-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const row = grid.get(s.id) ?? Array(12).fill(0);
              const rowTotal = row.reduce((a, b) => a + b, 0);
              return (
                <tr key={s.id} className="border-b">
                  <td className="p-3">
                    <p className="font-medium">{s.full_name || "(no name)"}</p>
                    {s.designation && (
                      <p className="text-xs text-muted-foreground">
                        {s.designation}
                      </p>
                    )}
                  </td>
                  {row.map((v, i) => (
                    <td
                      key={i}
                      className={`p-2 text-right ${v ? "" : "text-muted-foreground/40"}`}
                    >
                      {v ? formatCurrency(v) : "—"}
                    </td>
                  ))}
                  <td className="p-3 text-right font-semibold">
                    {formatCurrency(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-semibold">
              <td className="p-3">Total</td>
              {monthTotals.map((v, i) => (
                <td key={i} className="p-2 text-right">
                  {v ? formatCurrency(v) : "—"}
                </td>
              ))}
              <td className="p-3 text-right">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

function Summary({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-amber-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
