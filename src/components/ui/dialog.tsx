import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal accessible modal dialog (no Radix) — click-outside + Escape close.
 * Sized for touch: full-width sheet on small screens, centered card otherwise.
 */
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  title,
  className,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-lg sm:max-w-2xl sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-md active:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
