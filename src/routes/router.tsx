import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth, RequireRole } from "./guards";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { CustomerDetailPage } from "@/features/customers/CustomerDetailPage";
import { OrdersPage } from "@/features/orders/OrdersPage";
import { OrderFormPage } from "@/features/orders/OrderFormPage";
import { OrderDetailPage } from "@/features/orders/OrderDetailPage";
import { CollectionsPage } from "@/features/billing/CollectionsPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { StaffPage } from "@/features/staff/StaffPage";
import { GarmentTypesPage } from "@/features/garments/GarmentTypesPage";
import { GarmentTypeEditorPage } from "@/features/garments/GarmentTypeEditorPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: "customers",
        element: (
          <RequireRole roles={["owner", "counter"]}>
            <CustomersPage />
          </RequireRole>
        ),
      },
      {
        path: "customers/:id",
        element: (
          <RequireRole roles={["owner", "counter"]}>
            <CustomerDetailPage />
          </RequireRole>
        ),
      },
      { path: "orders", element: <OrdersPage /> },
      {
        path: "orders/new",
        element: (
          <RequireRole roles={["owner", "counter"]}>
            <OrderFormPage />
          </RequireRole>
        ),
      },
      {
        path: "orders/:id/edit",
        element: (
          <RequireRole roles={["owner", "counter"]}>
            <OrderFormPage />
          </RequireRole>
        ),
      },
      { path: "orders/:id", element: <OrderDetailPage /> },
      {
        path: "collections",
        element: (
          <RequireRole roles={["owner"]}>
            <CollectionsPage />
          </RequireRole>
        ),
      },
      {
        path: "inventory",
        element: (
          <RequireRole roles={["owner", "counter"]}>
            <InventoryPage />
          </RequireRole>
        ),
      },
      {
        path: "settings/garments",
        element: (
          <RequireRole roles={["owner"]}>
            <GarmentTypesPage />
          </RequireRole>
        ),
      },
      {
        path: "settings/garments/:id",
        element: (
          <RequireRole roles={["owner"]}>
            <GarmentTypeEditorPage />
          </RequireRole>
        ),
      },
      {
        path: "staff",
        element: (
          <RequireRole roles={["owner"]}>
            <StaffPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
