import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import CustomerListPage from "./features/customers/CustomerListPage";
import CustomerDetailPage from "./features/customers/CustomerDetailPage";
import CustomerFormPage from "./features/customers/CustomerFormPage";
import ProductListPage from "./features/products/ProductListPage";
import ProductDetailPage from "./features/products/ProductDetailPage";
import ProductFormPage from "./features/products/ProductFormPage";
import ChallanListPage from "./features/challans/ChallanListPage";
import ChallanDetailPage from "./features/challans/ChallanDetailPage";
import ChallanCreatePage from "./features/challans/ChallanCreatePage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomerListPage />} />
                <Route path="/customers/new" element={<CustomerFormPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />
                <Route path="/challans" element={<ChallanListPage />} />
                <Route path="/challans/new" element={<ChallanCreatePage />} />
                <Route path="/challans/:id" element={<ChallanDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
