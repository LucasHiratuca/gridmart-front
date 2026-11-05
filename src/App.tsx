import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccessPage } from "@/features/access/AccessPage"
import { AdminLayout } from "@/features/admin/AdminLayout"
import { AdminCategoriesPage } from "@/features/admin/AdminCategoriesPage"
import { AdminLogsPage } from "@/features/admin/AdminLogsPage"
import { AdminPriceGroupsPage } from "@/features/admin/AdminPriceGroupsPage"
import { AdminProductsPage } from "@/features/admin/AdminProductsPage"
import { AdminSalesPage } from "@/features/admin/AdminSalesPage"
import { AdminUsersPage } from "@/features/admin/AdminUsersPage"
import { AdminVisitsPage } from "@/features/admin/AdminVisitsPage"
import { HomePage } from "@/features/home/HomePage"
import { TotemPage } from "@/features/totem/TotemPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/totem" element={<TotemPage />} />
            <Route path="/acesso" element={<AccessPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="produtos" replace />} />
              <Route path="produtos" element={<AdminProductsPage />} />
              <Route path="categorias" element={<AdminCategoriesPage />} />
              <Route path="precos" element={<AdminPriceGroupsPage />} />
              <Route path="vendas" element={<AdminSalesPage />} />
              <Route path="visitas" element={<AdminVisitsPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="auditoria" element={<AdminLogsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" closeButton theme="light" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
