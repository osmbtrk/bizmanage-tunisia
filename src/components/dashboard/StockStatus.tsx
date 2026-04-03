import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DbProduct = Database['public']['Tables']['products']['Row'];

interface StockStatusProps {
  products: DbProduct[];
}

export default function StockStatus({ products }: StockStatusProps) {
  const [showAll, setShowAll] = useState(false);

  const { outOfStock, lowStock, okStock, sortedCritical } = useMemo(() => {
    const nonService = products.filter(p => p.product_type !== 'service');
    const out = nonService.filter(p => p.stock <= 0);
    const low = nonService.filter(p => p.stock > 0 && p.stock <= p.min_stock);
    const ok = nonService.filter(p => p.stock > p.min_stock);

    // Sort: out of stock first (by name), then low stock (by stock asc)
    const sorted = [
      ...out.sort((a, b) => a.name.localeCompare(b.name)),
      ...low.sort((a, b) => a.stock - b.stock),
      ...ok.sort((a, b) => a.stock - b.stock),
    ];

    return { outOfStock: out, lowStock: low, okStock: ok, sortedCritical: sorted };
  }, [products]);

  const total = outOfStock.length + lowStock.length + okStock.length;
  const displayList = showAll ? sortedCritical : sortedCritical.slice(0, 5);

  const getStatus = (p: DbProduct) => {
    if (p.stock <= 0) return { label: 'Rupture', color: 'destructive' as const, dot: 'bg-destructive' };
    if (p.stock <= p.min_stock) return { label: 'Bas', color: 'secondary' as const, dot: 'bg-warning' };
    return { label: 'OK', color: 'default' as const, dot: 'bg-success' };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package className="h-4 w-4" />
          État de stock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex gap-4 text-center">
          <div className="flex-1 rounded-lg bg-destructive/10 p-3">
            <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold text-destructive">{outOfStock.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rupture</p>
          </div>
          <div className="flex-1 rounded-lg bg-warning/10 p-3">
            <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold text-warning">{lowStock.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bas</p>
          </div>
          <div className="flex-1 rounded-lg bg-success/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-success">{okStock.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">OK</p>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            {outOfStock.length > 0 && (
              <div className="bg-destructive h-full" style={{ width: `${(outOfStock.length / total) * 100}%` }} />
            )}
            {lowStock.length > 0 && (
              <div className="bg-warning h-full" style={{ width: `${(lowStock.length / total) * 100}%` }} />
            )}
            {okStock.length > 0 && (
              <div className="bg-success h-full" style={{ width: `${(okStock.length / total) * 100}%` }} />
            )}
          </div>
        )}

        {/* Structured product list */}
        {total > 0 ? (
          <div className="space-y-1.5">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-5">Produit</div>
              <div className="col-span-3 text-right">Quantité</div>
              <div className="col-span-4 text-right">Statut</div>
            </div>

            {displayList.map(p => {
              const st = getStatus(p);
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 gap-2 items-center rounded-lg border px-3 py-2 text-sm ${
                    st.label === 'Rupture'
                      ? 'border-destructive/20 bg-destructive/5'
                      : st.label === 'Bas'
                        ? 'border-warning/20 bg-warning/5'
                        : 'border-border bg-card'
                  }`}
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${st.dot}`} />
                    <span className="truncate font-medium">{p.name}</span>
                  </div>
                  <div className="col-span-3 text-right tabular-nums font-semibold">
                    {p.stock} {p.unit}
                  </div>
                  <div className="col-span-4 text-right">
                    <Badge variant={st.color} className="text-xs">
                      {st.label}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {sortedCritical.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs gap-1"
                onClick={() => setShowAll(!showAll)}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Voir moins' : `Voir plus (${sortedCritical.length - 5} restants)`}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun produit en stock
          </p>
        )}
      </CardContent>
    </Card>
  );
}
