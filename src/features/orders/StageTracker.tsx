import { toast } from "sonner";
import { Check, Circle, Loader2, Lock } from "lucide-react";
import { ORDER_STAGES, type OrderFull } from "@/lib/database.types";
import { useRole } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { useUpdateStage } from "./api";

/**
 * Vertical 8-stage tracker. Tapping the next stage advances the order (writes
 * stage history via DB trigger + fires the WhatsApp notification). A staff
 * member may only set the stages the owner granted them (Staff page); owners
 * may set any. The same rule is enforced in the DB — see can_set_stage().
 * Stages 4 (Button Fix Given) and 5 (Button Fix Returned) mark the outsourced
 * button-hole work leaving and coming back.
 */
export function StageTracker({ order }: { order: OrderFull }) {
  const update = useUpdateStage();
  const { canSetStage } = useRole();
  const current = order.current_stage;

  async function goto(stage: number) {
    if (stage === current || update.isPending) return;
    if (!canSetStage(stage)) {
      toast.error(`You don't have permission to set “${ORDER_STAGES[stage - 1]}”`);
      return;
    }
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
        // The current stage is never "settable" (tapping it is a no-op), so
        // don't mark it locked just because this user couldn't re-set it.
        const locked = !active && !canSetStage(stage);
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => goto(stage)}
              disabled={update.isPending || locked}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left",
                active && "bg-primary/10",
                locked && "cursor-not-allowed opacity-50",
                !locked && (isNext || (!done && !active)) && "active:bg-accent",
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
              {locked ? (
                <Lock className="ml-auto size-4 shrink-0 text-muted-foreground" />
              ) : (
                isNext && (
                  <span className="ml-auto text-xs font-medium text-primary">
                    Tap to advance →
                  </span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
