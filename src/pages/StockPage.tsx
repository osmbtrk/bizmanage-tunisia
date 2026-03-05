import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Package, AlertTriangle, ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';

export default function StockPage() {
  const { products, stockMovements } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredProducts = useMemo(() => {
    let list = products;
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') list = list.filter(p => p.product_type === typeFilter);
    return list;
  }, [products, search, typeFilter]);

  const filteredMovements = useMemo(() => {
    let list = [...stockMovements];
    if (movementFilter !== 'all') list = list.filter(m => m.type === movementFilter);
    if (search) list = list.filter(m => m.product_name.toLowerCase().includes(search.toLowerCase()));
    if (dateFrom) list = list.filter(m => new Date(m.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter(m => new Date(m.date) <= new Date(dateTo + 'T23:59:59'));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, movementFilter, search, dateFrom, dateTo]);

  const totalValuation = useMemo(() => 
    products.reduce((s, p) => s + p.stock * Number(p.purchase_price), 0), [products]);
  const totalSellingValue = useMemo(() => 
    products.reduce((s, p) => s + p.stock * Number(p.selling_price), 0), [products]);
  const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;

  const formatDT = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Gestion du Stock</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valeur d'achat</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{formatDT(totalValuation)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valeur de vente</p>
            <p className="text-xl font-bold mt-1 tabular-nums text-primary">{formatDT(totalSellingValue)}</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Marge potentielle</p>
            <p className="text-xl font-bold mt-1 tabular-nums text-[hsl(var(--success))]">{formatDT(totalSellingValue - totalValuation)}</p>
          </CardContent>
        </Card>
        <Card className={`transition-all duration-200 hover:shadow-md ${lowStockCount > 0 ? 'border-l-4 border-l-destructive' : ''}`}>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Alertes stock</p>
            <p className={`text-xl font-bold mt-1 ${lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockCount > 0 && (
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-bold text-destructive">Produits en alerte</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {products.filter(p => p.stock <= p.min_stock).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-card border border-destructive/20 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${p.stock <= 0 ? 'bg-destructive' : 'bg-warning'}`} />
                    <span className="truncate font-medium">{p.name}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${p.stock <= 0 ? 'text-destructive' : 'text-warning'}`}>
                    {p.stock} {p.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher produit..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="finished_product">Produit fini</SelectItem>
            <SelectItem value="raw_material">Matière première</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={movementFilter} onValueChange={setMovementFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Mouvement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous mouvements</SelectItem>
            <SelectItem value="in">Entrées</SelectItem>
            <SelectItem value="out">Sorties</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="Du" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="Au" />
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Inventaire ({filteredProducts.length} produits)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Produit</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-right">Stock</th>
                  <th className="pb-3 font-medium text-right">Min</th>
                  <th className="pb-3 font-medium text-right">Prix achat</th>
                  <th className="pb-3 font-medium text-right">Valeur</th>
                  <th className="pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isLow = p.stock <= p.min_stock;
                  const isOut = p.stock <= 0;
                  const typeLabels: Record<string, string> = { finished_product: 'Produit fini', raw_material: 'Matière première', service: 'Service' };
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-200">
                      <td className="py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">{typeLabels[p.product_type] || p.product_type}</Badge>
                      </td>
                      <td className="py-3 text-right tabular-nums font-semibold">
                        <span className={isOut ? 'text-destructive' : isLow ? 'text-warning' : ''}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">{p.min_stock}</td>
                      <td className="py-3 text-right tabular-nums">{Number(p.purchase_price).toFixed(3)}</td>
                      <td className="py-3 text-right tabular-nums font-medium">{formatDT(p.stock * Number(p.purchase_price))}</td>
                      <td className="py-3">
                        {isOut ? (
                          <Badge variant="destructive" className="text-xs">Rupture</Badge>
                        ) : isLow ? (
                          <Badge className="text-xs bg-warning/15 text-warning border-warning/30">Bas</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-[hsl(var(--success))]">OK</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Movement History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Historique des mouvements ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun mouvement trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Produit</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium text-right">Quantité</th>
                    <th className="pb-3 font-medium">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.slice(0, 50).map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors duration-200">
                      <td className="py-2.5 text-muted-foreground">{new Date(m.date).toLocaleDateString('fr-TN')}</td>
                      <td className="py-2.5 font-medium">{m.product_name}</td>
                      <td className="py-2.5">
                        <Badge variant={m.type === 'in' ? 'outline' : 'secondary'} className={`text-xs ${m.type === 'in' ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {m.type === 'in' ? <ArrowDown className="h-3 w-3 mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
                          {m.type === 'in' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-semibold">{m.quantity}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{m.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
