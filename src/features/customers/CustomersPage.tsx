import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users, Phone, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Customer } from "@/lib/database.types";
import { useCustomers } from "./api";
import { CustomerFormDialog } from "./CustomerFormDialog";

/** Group customers by phone so all people on one number appear together. */
function groupByPhone(customers: Customer[]) {
  const map = new Map<string, Customer[]>();
  for (const c of customers) {
    const list = map.get(c.phone) ?? [];
    list.push(c);
    map.set(c.phone, list);
  }
  return [...map.entries()].map(([phone, people]) => ({ phone, people }));
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: customers, isLoading, error } = useCustomers(search);

  const groups = useMemo(
    () => groupByPhone(customers ?? []),
    [customers],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Search by name or phone. Several people can share one phone number."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> New Customer
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone"
          className="pl-11"
          inputMode="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Could not load customers: {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !customers || customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={
            search
              ? "Try a different search term."
              : "Add your first customer to get started."
          }
          action={
            !search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus /> New Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(({ phone, people }) => (
            <div key={phone}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="size-4" /> {phone}
                {people.length > 1 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {people.length} people
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {people.map((c) => (
                  <Link key={c.id} to={`/customers/${c.id}`}>
                    <Card className="flex items-center justify-between p-4 active:bg-accent">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{c.name}</p>
                        {c.notes && (
                          <p className="truncate text-sm text-muted-foreground">
                            {c.notes}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
