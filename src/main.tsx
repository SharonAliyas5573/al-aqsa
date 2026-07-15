import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { queryClient, persister } from "@/lib/queryClient";
import { router } from "@/routes/router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
);
