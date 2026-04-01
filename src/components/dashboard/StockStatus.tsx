import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DbProduct = Database['public']['Tables']['products']['Row'];

interface StockStatusProps {
  products: DbProduct[];
}

export default function StockStatus({ products }: StockStatusProps) {
  const { outOfStock, lowStock, okStock } = useMemo(() => {
    const nonService = products.filter(p => p.product_type !== 'service');
    return {
      outOfStock: nonService.filter(p => p.stock <= 0),
      lowStock: nonService.filter(p => p.stock > 0 && p.stock <= p.min_stock),
      okStock: nonService.filter(p => p.stock > p.min_stock),
    };
  }, [products]);

  const total = outOfStock.length + lowStock.length + okStock.length;

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

        {/* Product list */}
        {(outOfStock.length > 0 || lowStock.length > 0) && (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {outOfStock.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                  <span className="truncate font-medium">{p.name}</span>
                </div>
                <Badge variant="destructive" className="text-xs ml-2 shrink-0">
                  {p.stock} {p.unit}
                </Badge>
              </div>
            ))}
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-warning shrink-0" />
                  <span className="truncate font-medium">{p.name}</span>
                </div>
                <span className="text-xs font-semibold text-warning ml-2 shrink-0 tabular-nums">
                  {p.stock}/{p.min_stock} {p.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {outOfStock.length === 0 && lowStock.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Tous les produits sont en stock suffisant ✓
          </p>
        )}
      </CardContent>
    </Card>
  );
}
