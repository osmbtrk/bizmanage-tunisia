import { FileText } from 'lucide-react';

export default function PurchaseInvoicesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Factures Fournisseurs</h1>
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Module en cours de développement</p>
        <p className="text-sm mt-1">La gestion des factures fournisseurs sera bientôt disponible.</p>
      </div>
    </div>
  );
}
