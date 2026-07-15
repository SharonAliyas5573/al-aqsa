import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, Loader2 } from "lucide-react";
import {
  BUTTONHOLE_DONE_STAGE,
  BUTTONHOLE_GIVEN_STAGE,
  ORDER_STAGES,
  type OrderFull,
} from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateButtonhole, useUpdateStage } from "./api";

/**
 * Vertical 9-stage tracker. Tapping the next stage advances the order (writes
 * stage history via DB trigger + fires the WhatsApp notification). Any role
 * that can see the order may advance it (owner/counter/assigned tailor).
 * Stages 5 (Button Fix Given) and 6 (Button Fixed) also track the outsourced
 * button-hole given/returned counts.
 */
export function StageTracker({ order }: { order: OrderFull }) {
  const update = useUpdateStage();
  const current = order.current_stage;

  async function goto(stage: number) {
    if (stage === current || update.isPending) return;
    try {
      await update.mutateAsync({ order, stage });
      toast.success(`Moved to “${ORDER_STAGES[stage - 1]}”`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <ol className="space-y-1">
      {ORDER_STAGES.map((label, i) => {
        const stage = i + 1;
        const done = stage < current;
        const active = stage === current;
        const isNext = stage === current + 1;
        const showButtonhole =
          (stage === BUTTONHOLE_GIVEN_STAGE ||
            stage === BUTTONHOLE_DONE_STAGE) &&
          current >= BUTTONHOLE_GIVEN_STAGE;
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => goto(stage)}
              disabled={update.isPending}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left",
                active && "bg-primary/10",
                (isNext || (!done && !active)) && "active:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done &&
                    !active &&
                    "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {update.isPending && active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : done ? (
                  <Check className="size-4" />
                ) : active ? (
                  <Circle className="size-3 fill-current" />
                ) : (
                  <span className="text-xs font-semibold">{stage}</span>
                )}
              </span>
              <span
                className={cn(
                  "font-medium",
                  active && "text-primary",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {isNext && (
                <span className="ml-auto text-xs font-medium text-primary">
                  Tap to advance →
                </span>
              )}
            </button>

            {showButtonhole && stage === BUTTONHOLE_GIVEN_STAGE && (
              <ButtonholeTracker order={order} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Given vs returned counts for the outsourced button-hole work. */
function ButtonholeTracker({ order }: { order: OrderFull }) {
  const save = useUpdateButtonhole();
  const [given, setGiven] = useState<string>(
    order.buttonhole_given?.toString() ?? "",
  );
  const [returned, setReturned] = useState<string>(
    order.buttonhole_returned?.toString() ?? "",
  );

  useEffect(() => {
    setGiven(order.buttonhole_given?.toString() ?? "");
    setReturned(order.buttonhole_returned?.toString() ?? "");
  }, [order.buttonhole_given, order.buttonhole_returned]);

  async function onSave() {
    try {
      await save.mutateAsync({
        orderId: order.id,
        given: given === "" ? null : Number(given),
        returned: returned === "" ? null : Number(returned),
      });
      toast.success("Button-hole counts saved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="ml-11 mt-1 rounded-md border border-dashed p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Button-hole (outsourced) — track given vs returned
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Given</label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={given}
            onChange={(e) => setGiven(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Returned</label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={returned}
            onChange={(e) => setReturned(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={save.isPending}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
