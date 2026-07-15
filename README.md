# Al Aqsa Tailor — Order Management System

Touch-first **PWA** tailor shop OMS. Runs on an Android tablet at the counter:
customer intake, **dynamic garment types with photo-card models** (Kandhura now,
shirts/others later — all admin-configurable), reusable per-person measurements
(several people can share one phone), orders through 9 production stages
(including outsourced button-hole tracking), **split cloth + stitch billing**,
thermal cloth/stitch/job-order receipts, an A4 invoice, WhatsApp notifications,
and fabric inventory.

**Stack:** React + TypeScript + Vite + Tailwind + shadcn-style UI · Supabase
(Postgres + Auth + RLS + Edge Functions) · jsPDF · Meta WhatsApp Cloud API ·
`vite-plugin-pwa`.

---

## 1. Prerequisites

- Node 18+ and npm
- A Supabase project (free tier is enough)
- (Later, for live WhatsApp) a Meta WhatsApp Business account + dedicated number

## 2. Install & configure

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your Supabase project values:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
VITE_WHATSAPP_MODE=mock          # keep "mock" until Meta is set up
VITE_SHOP_NAME=Al Aqsa Tailor Shop
VITE_SHOP_PHONE=+91 ...
VITE_SHOP_ADDRESS=...
```

> The app boots with placeholder values, but login and data only work once real
> Supabase credentials are in place.

## 3. Set up the database

In the Supabase dashboard → **SQL Editor**, run the migrations in order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions_triggers.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0005_dynamic_garments.sql` — dynamic garment types,
   model photo-cards, split billing, button-hole tracking, and the
   `model-photos` storage bucket (created by this migration).

(Or use the Supabase CLI: `supabase db push`.)

> `0005` is destructive to `customer_measurements` and `order_items` (fresh
> build — no real data to preserve). It replaces the fixed-column Thobe
> measurements with a garment-type-driven system.

### Create the first owner (bootstrap)

RLS lets only an existing owner manage staff, so the first owner is created
out-of-band:

1. Dashboard → **Authentication → Users → Add user** — create the owner's email
   + password (mark email confirmed). Copy the new user's UUID.
2. Run `0004_seed_owner.sql` with that UUID + name filled in.

After that, the owner logs in and adds all other staff from the **Staff** screen.

### First-run: build your garment types (in the app)

Nothing garment-specific is seeded — the owner creates it in the UI:

1. Log in as owner → **Garment Types** (sidebar) → **New Garment Type** (e.g.
   "Kandhura").
2. Open it → add **measurement fields**. Use type **Number** for plain values
   (Length, Shoulder…) and **Model + number** for fields that also have a style
   picked from a photo (Neck, Collar, Wrist, Pocket).
3. Add **model photo cards** — for the garment itself ("Garment Models") and for
   each model-bearing field. Upload a photo per card (stored in the
   `model-photos` bucket).

Repeat for any other garment (Shirt, etc.). Each type has its own fields/models.

## 4. Run

```bash
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview the production build (test PWA install/offline)
```

## 5. Deploy (Vercel)

- Import the repo in Vercel (framework preset: **Vite**).
- Add the same `VITE_*` env vars in Project Settings.
- `vercel.json` already rewrites all routes to `index.html` for the SPA router.

## 6. WhatsApp (Meta Cloud API) — going live

Phase 1 ships with `VITE_WHATSAPP_MODE=mock`: stage changes render the exact
message as a toast so the whole flow works with no external account.

To go live:

1. Create + verify a Meta WhatsApp Business app and register the shop's
   **dedicated** number (not a personal WhatsApp).
2. Get Meta to **approve** the 5 templates (see `src/features/notify/templates.ts`
   for the exact wording and template names).
3. Deploy the edge function and set secrets:

   ```bash
   supabase functions deploy send-whatsapp
   supabase secrets set META_WA_TOKEN=... META_WA_PHONE_NUMBER_ID=...
   ```

4. Set `VITE_WHATSAPP_MODE=live` and redeploy the frontend.

## 7. Staff invite (create-staff edge function)

The owner-only "Add Staff" screen calls the `create-staff` edge function, which
creates the auth user + profile in one step using the service role.

```bash
supabase functions deploy create-staff
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided
to functions automatically on Supabase; set them manually only if running
functions locally.

## 8. Thermal printing

The order screen prints three separate 80mm receipts, each via its own button:
**Cloth Bill** (fabric · metres · rate · amount), **Stitch Bill** (what to
stitch + amount, plus paid/balance), and **Job Order** (measurements + models for
the cutter/tailor, no prices). Each button adds a `.printing` class to just that
receipt node before `window.print()`; the global print CSS (`src/index.css`)
reveals only the marked node, sized via `@page`. On the Android tablet, choose
the Bluetooth thermal printer in Chrome's print dialog. The **A4 PDF** / **Share**
buttons produce the combined jsPDF invoice.

---

## Roles

| Role  | Access |
|-------|--------|
| Owner | Everything: Collections, Inventory, Staff, **Salary**, Garment settings, all money |
| Staff | Customers, Orders (create/edit/print, advance stages), Measurements, Inventory. **No** payments/collections, salary, staff, or garment settings |

Enforced in the UI *and* at the database with Row Level Security.

Staff each have a free-text **designation** (Cutter, Tailor, Ironing…) and a
**monthly salary**; the owner records salary payments month-by-month under
**Salary** (with a yearly report).

### Login with a username

Staff log in with a **username**, not an email. Under the hood a username `ravi`
maps to a hidden internal address `ravi@alaqsa.local` (Supabase Auth needs an
email). If a login value already contains `@` it's used as-is, so the original
email-based owner account keeps working. See `usernameToEmail` in
`src/lib/config.ts`.

> Migration `0006_roles_and_salary.sql` collapses the old owner/counter/tailor
> roles to **owner/staff** (existing counter + tailor accounts become staff) and
> adds the salary module. Redeploy the `create-staff` edge function after
> applying it (`supabase functions deploy create-staff`) — it now takes a
> username + designation + salary.

## Project layout

```
src/
  components/       app shell, shared UI (button, card, dialog, …)
  features/
    auth/           login, session, role hooks
    garments/       owner-only garment types, fields, model photo-cards
    customers/      list (phone-grouped), detail, per-garment measurements
    measurements/   dynamic measurement form + photo-card ModelPicker
    orders/         list + order-no search, kiosk form, detail, 9-stage tracker
    billing/        payments, collections
    inventory/      fabrics + stock + rate
    staff/          owner-only staff (username, designation, salary)
    salary/         owner-only monthly salary payments + yearly report
    print/          cloth bill · stitch bill · job order · A4 jsPDF invoice
    notify/         WhatsApp templates + mock/live client
    dashboard/      KPIs, stage summary, alerts
  lib/              supabase client, query client, types, config
  routes/           router + role guards
supabase/
  migrations/       schema, triggers, RLS, owner bootstrap
  functions/        send-whatsapp, create-staff
```
