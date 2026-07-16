/**
 * Hand-written types mirroring the Supabase schema (see supabase/migrations).
 * Kept in sync with the SQL manually; can be regenerated later with
 * `supabase gen types typescript`.
 */

export type Role = "owner" | "staff";
export type PaymentStatus = "paid" | "partial" | "pending";
export type PaymentMode = "cash" | "upi";

/**
 * 8 production stages, in sequence. Index 0 unused; stages are 1..8.
 * Measurements are captured during order creation, so an order opens at
 * "Measurement" — there is no separate intake stage.
 */
export const ORDER_STAGES = [
  "Measurement",
  "Cutting",
  "Stitching",
  "Button Fix Given",
  "Button Fix Returned",
  "Ironing",
  "Packed",
  "Delivered",
] as const;

export type StageName = (typeof ORDER_STAGES)[number];

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
  username: string | null;
  designation: string | null;
  monthly_salary: number;
  /**
   * Stage numbers this staff member may set on an order.
   * null = no restriction (every stage). Owners are never restricted.
   */
  allowed_stages: number[] | null;
  created_at: string;
}

/** Can this profile move an order to `stage`? Mirrors public.can_set_stage(). */
export function canSetStage(
  profile: Pick<Profile, "role" | "allowed_stages"> | null | undefined,
  stage: number,
): boolean {
  if (!profile) return false;
  if (profile.role === "owner") return true;
  if (profile.allowed_stages == null) return true;
  return profile.allowed_stages.includes(stage);
}

/** A recorded monthly salary payment for a staff member. */
export interface SalaryPayment {
  id: string;
  staff_id: string;
  /** First day of the month, e.g. 2026-07-01. */
  period: string;
  amount: number;
  mode: PaymentMode;
  paid_at: string;
  note: string | null;
  created_by: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp_number: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Dynamic garment types & measurement templates
// ---------------------------------------------------------------------------

export type MeasurementInput = "number" | "model" | "model_number" | "text";

export interface GarmentType {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface MeasurementField {
  id: string;
  garment_type_id: string;
  key: string;
  label: string;
  input_type: MeasurementInput;
  unit: string | null;
  required: boolean;
  sort_order: number;
  created_at: string;
}

export interface FieldModel {
  id: string;
  garment_type_id: string;
  /** null = garment-level model (e.g. "Kandhura Model"); set = a per-field model. */
  field_id: string | null;
  name: string;
  photo_path: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

/** A garment type together with its fields and all its model options. */
export interface GarmentTypeFull extends GarmentType {
  fields: MeasurementField[];
  models: FieldModel[];
}

/** One captured measurement value: a number and/or a chosen model + note. */
export interface MeasurementValue {
  value: number | null;
  model_id: string | null;
  note: string | null;
}

/** The dynamic measurement map, keyed by MeasurementField.key. */
export type MeasurementValues = Record<string, MeasurementValue>;

/** One reusable measurement set per (customer, garment type). */
export interface CustomerMeasurement {
  id: string;
  customer_id: string;
  garment_type_id: string;
  values: MeasurementValues;
  notes: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface Fabric {
  id: string;
  name: string;
  colour: string | null;
  stock_metres: number;
  min_threshold: number;
  rate_per_metre: number;
  supplier_name: string | null;
  supplier_contact: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface Order {
  id: string;
  order_no: string;
  customer_id: string;
  expected_delivery: string | null;
  assigned_tailor: string | null;
  current_stage: number;
  total_amount: number;
  payment_status: PaymentStatus;
  created_by: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  garment_type_id: string | null;
  garment_model_id: string | null;
  quantity: number;
  fabric_id: string | null;
  fabric_metres: number | null;
  colour: string | null;
  stitch_note: string | null;
  stitch_amount: number;
  measurements: MeasurementValues;
  design_notes: string | null;
}

export interface OrderStageHistory {
  id: string;
  order_id: string;
  stage: number;
  changed_by: string | null;
  changed_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  mode: PaymentMode;
  paid_at: string;
  created_by: string | null;
}

/** Convenience shapes for joined queries used across the app. */
export interface OrderWithCustomer extends Order {
  customer: Customer;
}

export interface OrderItemFull extends OrderItem {
  fabric: Fabric | null;
  garment_type: GarmentType | null;
  garment_model: FieldModel | null;
}

export interface OrderFull extends Order {
  customer: Customer;
  items: OrderItemFull[];
  payments: Payment[];
  stage_history: OrderStageHistory[];
  tailor: Profile | null;
}

// ---------------------------------------------------------------------------
// Billing helpers
// ---------------------------------------------------------------------------

/** Cloth amount for one item: metres × quantity × fabric rate. */
export function clothAmount(item: {
  fabric_metres: number | null;
  quantity: number;
  fabric: Fabric | null;
}): number {
  const rate = item.fabric?.rate_per_metre ?? 0;
  return (item.fabric_metres ?? 0) * item.quantity * rate;
}
