import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import InvoicesPage from "@/pages/InvoicesPage";
import ClientsPage from "@/pages/ClientsPage";
import ProductsPage from "@/pages/ProductsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ExpensesPage from "@/pages/ExpensesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DataProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/factures" element={<InvoicesPage docType="facture" title="Factures" />} />
              <Route path="/devis" element={<InvoicesPage docType="devis" title="Devis" />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/produits" element={<ProductsPage />} />
              <Route path="/fournisseurs" element={<SuppliersPage />} />
              <Route path="/depenses" element={<ExpensesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
