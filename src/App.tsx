import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import InvoicesPage from "@/pages/InvoicesPage";
import ClientsPage from "@/pages/ClientsPage";
import ProductsPage from "@/pages/ProductsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import StockPage from "@/pages/StockPage";
import StockMovementsPage from "@/pages/StockMovementsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import PurchaseInvoicesPage from "@/pages/PurchaseInvoicesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import TaxesPage from "@/pages/TaxesPage";
import PosPage from "@/pages/PosPage";
import SettingsPage from "@/pages/SettingsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ArchivePage from "@/pages/ArchivePage";
import PaymentsPage from "@/pages/PaymentsPage";
import ReturnsPage from "@/pages/ReturnsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import TaxDeclarationPage from "@/pages/TaxDeclarationPage";
import Index from "@/pages/Index";
import LandingPage from "@/pages/LandingPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/factures" element={<InvoicesPage docType="facture" title="Factures" />} />
          <Route path="/devis" element={<InvoicesPage docType="devis" title="Devis" />} />
          <Route path="/paiements" element={<PaymentsPage />} />
          <Route path="/retours" element={<ReturnsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/produits" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/mouvements" element={<StockMovementsPage />} />
          <Route path="/fournisseurs" element={<SuppliersPage />} />
          <Route path="/factures-fournisseurs" element={<PurchaseInvoicesPage />} />
          <Route path="/depenses" element={<ExpensesPage />} />
          <Route path="/taxes" element={<TaxesPage />} />
          <Route path="/archives" element={<ArchivePage />} />
          <Route path="/analytiques" element={<AnalyticsPage />} />
          <Route path="/rh" element={<EmployeesPage />} />
          <Route path="/declarations" element={<TaxDeclarationPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DataProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Index />;
}

function LandingRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthRoute />} />
              <Route path="/landing" element={<LandingRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
