import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, TrendingUp } from 'lucide-react';

export default function TaxesPage() {
  const { invoices, expenses } = useData();

  const stats = useMemo(() => {
    const tvaCollected = invoices
      .filter(i => i.type === 'facture')
      .reduce((s, i) => s + (i.tva_total || 0), 0);
    const tvaPaid = expenses.reduce((s, e) => s + (e.tva_amount || 0), 0);
    return { tvaCollected, tvaPaid, net: tvaCollected - tvaPaid };
  }, [invoices, expenses]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Taxes & TVA</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA collectée</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.tvaCollected.toFixed(3)} TND</div>
            <p className="text-xs text-muted-foreground mt-1">Sur les factures émises</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA déductible</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.tvaPaid.toFixed(3)} TND</div>
            <p className="text-xs text-muted-foreground mt-1">Sur les dépenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVA nette à reverser</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-warning' : 'text-success'}`}>
              {stats.net.toFixed(3)} TND
            </div>
            <p className="text-xs text-muted-foreground mt-1">Collectée - Déductible</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Des rapports de TVA détaillés seront bientôt disponibles.</p>
      </div>
    </div>
  );
}
