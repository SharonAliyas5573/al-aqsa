import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Ruler,
  Phone,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import {
  DynamicMeasurementForm,
  emptyValues,
  normalizeValues,
} from "@/features/measurements/DynamicMeasurementForm";
import { useGarmentTypeFull, useGarmentTypes } from "@/features/garments/api";
import { useOrdersByCustomer } from "@/features/orders/api";
import { ORDER_STAGES, type MeasurementValues } from "@/lib/database.types";
import { formatCurrency } from "@/lib/utils";
import {
  useCustomer,
  useCustomerMeasurement,
  useCustomersByPhone,
  useSaveCustomerMeasurement,
} from "./api";
import { CustomerFormDialog } from "./CustomerFormDialog";

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: orders } = useOrdersByCustomer(id);
  const { data: garmentTypes } = useGarmentTypes(true);
  const { data: samePhone } = useCustomersByPhone(customer?.phone);

  const [editOpen, setEditOpen] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);

  // Measurement editor: choose a garment type, edit its values.
  const [garmentTypeId, setGarmentTypeId] = useState("");
  const { data: garment } = useGarmentTypeFull(garmentTypeId || undefined);
  const { data: savedSet } = useCustomerMeasurement(
    id,
    garmentTypeId || undefined,
  );
  const saveMeasurement = useSaveCustomerMeasurement();
  const [values, setValues] = useState<MeasurementValues>({});

  // Default the garment-type dropdown to the first active type.
  useEffect(() => {
    if (!garmentTypeId && garmentTypes && garmentTypes.length > 0) {
      setGarmentTypeId(garmentTypes[0].id);
    }
  }, [garmentTypes, garmentTypeId]);

  // Load saved values (or empty) whenever the garment type / saved set changes.
  useEffect(() => {
    if (!garment) return;
    setValues(normalizeValues(garment.fields, savedSet?.values ?? null));
  }, [garment, savedSet]);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!customer) return <p>Customer not found.</p>;

  const otherPeople = (samePhone ?? []).filter((c) => c.id !== customer.id);

  async function onSaveMeasurement() {
    if (!garmentTypeId) {
      toast.error("Pick a garment type");
      return;
    }
    try {
      await saveMeasurement.mutateAsync({
        customer_id: id!,
        garment_type_id: garmentTypeId,
        values,
      });
      toast.success("Measurements saved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-4" /> {customer.phone}
            </span>
            {customer.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {customer.address}
              </span>
            )}
          </div>
          {customer.notes && <p className="mt-2 text-sm">{customer.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          <Link to={`/orders/new?customer=${customer.id}`}>
            <Button>
              <Plus /> New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Other people on this phone number */}
      {otherPeople.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" /> Others on {customer.phone}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddPersonOpen(true)}
            >
              <UserPlus /> Add person
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {otherPeople.map((p) => (
              <Link key={p.id} to={`/customers/${p.id}`}>
                <Badge variant="secondary" className="cursor-pointer">
                  {p.name}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      {otherPeople.length === 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddPersonOpen(true)}
        >
          <UserPlus /> Add another person on {customer.phone}
        </Button>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ruler className="size-5" /> Measurements
            </CardTitle>
            <Button
              size="sm"
              onClick={onSaveMeasurement}
              disabled={saveMeasurement.isPending || !garmentTypeId}
            >
              Save
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!garmentTypes || garmentTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No garment types yet. Create one in{" "}
                <Link to="/settings/garments" className="text-primary underline">
                  Settings → Garment Types
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Select
                    value={garmentTypeId}
                    onChange={(e) => setGarmentTypeId(e.target.value)}
                  >
                    {garmentTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {garment ? (
                  garment.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This garment type has no measurement fields yet.
                    </p>
                  ) : (
                    <DynamicMeasurementForm
                      garment={garment}
                      values={
                        Object.keys(values).length
                          ? values
                          : emptyValues(garment.fields)
                      }
                      onChange={setValues}
                    />
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}
                <p className="text-xs text-muted-foreground">
                  These auto-fill new orders. Measuring again on a new order
                  updates this set to the latest numbers.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <Link key={o.id} to={`/orders/${o.id}`}>
                    <div className="flex items-center justify-between rounded-md border p-3 active:bg-accent">
                      <div>
                        <p className="font-medium">{o.order_no}</p>
                        <p className="text-sm text-muted-foreground">
                          {ORDER_STAGES[o.current_stage - 1]} ·{" "}
                          {formatCurrency(o.total_amount)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          o.payment_status === "paid"
                            ? "success"
                            : o.payment_status === "partial"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {o.payment_status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />
      <CustomerFormDialog
        open={addPersonOpen}
        onOpenChange={setAddPersonOpen}
        defaultPhone={customer.phone}
        onSaved={(c) => navigate(`/customers/${c.id}`)}
      />
    </div>
  );
}
