import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StockMovementsPage() {
  const { stockMovements } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = [...stockMovements];
    if (typeFilter !== 'all') list = list.filter(m => m.type === typeFilter);
    if (search) list = list.filter(m => m.product_name.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, search, typeFilter]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Mouvements de Stock</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par produit..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="in">Entrées</SelectItem>
            <SelectItem value="out">Sorties</SelectItem>
            <SelectItem value="adjustment">Ajustements</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowLeftRight className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun mouvement trouvé</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Produit</th>
                <th className="text-center p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Quantité</th>
                <th className="text-left p-3 font-medium">Raison</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">{format(new Date(m.date), 'dd MMM yyyy', { locale: fr })}</td>
                  <td className="p-3 font-medium">{m.product_name}</td>
                  <td className="p-3 text-center">
                    <Badge variant={m.type === 'in' ? 'default' : m.type === 'out' ? 'destructive' : 'secondary'} className="gap-1">
                      {m.type === 'in' ? <ArrowDown className="h-3 w-3" /> : m.type === 'out' ? <ArrowUp className="h-3 w-3" /> : <ArrowLeftRight className="h-3 w-3" />}
                      {m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : 'Ajustement'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium">{m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity}</td>
                  <td className="p-3 text-muted-foreground">{m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
