import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { PaymentMode } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import { useAddPayment } from "./api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderId: string;
  balance: number;
}

export function PaymentDialog({ open, onOpenChange, orderId, balance }: Props) {
  const add = useAddPayment();
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<PaymentMode>("cash");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await add.mutateAsync({ order_id: orderId, amount: value, mode });
      toast.success("Payment recorded");
      setAmount("");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Record Payment">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Balance due: {formatCurrency(balance)}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="p-amount">Amount (₹)</Label>
          <Input
            id="p-amount"
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {balance > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAmount(String(balance))}
            >
              Pay full balance ({formatCurrency(balance)})
            </Button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-mode">Mode</Label>
          <Select
            id="p-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
