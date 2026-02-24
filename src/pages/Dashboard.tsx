import { useData } from '@/contexts/DataContext';
import { FileText, Users, Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { invoices, clients, products, expenses } = useData();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && i.type === 'facture';
    });

    const monthlyRevenue = thisMonth.reduce((s, i) => s + i.total, 0);
    const unpaidInvoices = invoices.filter(i => i.type === 'facture' && i.status !== 'paid');
    const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + e.amount, 0);

    return { monthlyRevenue, unpaidTotal, unpaidCount: unpaidInvoices.length, lowStockProducts, monthlyExpenses };
  }, [invoices, products, expenses]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoices.filter(i => i.type === 'facture').forEach(inv => {
      inv.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productSales[item.productId].qty += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [invoices]);

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Chiffre d'affaires du mois" value={formatDT(stats.monthlyRevenue)} color="text-accent" />
        <StatCard icon={DollarSign} label="Impayés" value={formatDT(stats.unpaidTotal)} sub={`${stats.unpaidCount} facture(s)`} color="text-destructive" />
        <StatCard icon={Users} label="Clients" value={String(clients.length)} color="text-primary" />
        <StatCard icon={Package} label="Produits" value={String(products.length)} color="text-primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dernières factures</h3>
          {invoices.filter(i => i.type === 'facture').slice(-5).reverse().length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune facture pour le moment</p>
          ) : (
            <div className="space-y-3">
              {invoices.filter(i => i.type === 'facture').slice(-5).reverse().map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatDT(inv.total)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock & top products */}
        <div className="space-y-4">
          {stats.lowStockProducts.length > 0 && (
            <div className="stat-card border-warning/30 bg-warning/5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> Stock faible
              </h3>
              <div className="space-y-2">
                {stats.lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="font-semibold text-warning">{p.stock} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="stat-card">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top produits</h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Pas encore de ventes</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-sm font-medium">{formatDT(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'status-paid',
    unpaid: 'status-unpaid',
    partial: 'status-partial',
  };
  const labels: Record<string, string> = {
    paid: 'Payée', unpaid: 'Impayée', partial: 'Partielle',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
