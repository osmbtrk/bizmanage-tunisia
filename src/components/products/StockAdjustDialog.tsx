import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, Hash } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { productsApi, stockMovementsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DbProduct = Database['public']['Tables']['products']['Row'];

interface StockAdjustDialogProps {
  product: DbProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockAdjustDialog({ product, open, onOpenChange }: StockAdjustDialogProps) {
  const [tab, setTab] = useState<string>('increase');
  const [quantity, setQuantity] = useState(1);
  const [exactValue, setExactValue] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { refresh } = useData();
  const { companyId } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!product || !companyId) return;
    setLoading(true);

    try {
      let delta: number;
      let movementReason: string;

      if (tab === 'increase') {
        delta = quantity;
        movementReason = reason || 'Ajustement manuel (entrée)';
      } else if (tab === 'decrease') {
        delta = -quantity;
        movementReason = reason || 'Ajustement manuel (sortie)';
      } else {
        delta = exactValue - product.stock;
        movementReason = reason || `Correction de stock (${product.stock} → ${exactValue})`;
      }

      if (delta === 0) {
        toast({ title: 'Aucun changement', description: 'La quantité est identique.' });
        setLoading(false);
        return;
      }

      const { error } = await productsApi.adjustStock(product.id, delta);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      await stockMovementsApi.insertStockMovement({
        company_id: companyId,
        product_id: product.id,
        product_name: product.name,
        type: delta > 0 ? 'in' : 'out',
        quantity: Math.abs(delta),
        reason: movementReason,
      });

      toast({ title: 'Stock mis à jour', description: `${product.name}: ${product.stock} → ${product.stock + delta}` });
      refresh();
      onOpenChange(false);
      setQuantity(1);
      setExactValue(0);
      setReason('');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier le stock — {product.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Stock actuel: <span className="font-bold text-foreground">{product.stock} {product.unit}</span>
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="increase" className="gap-1"><Plus className="h-3 w-3" /> Entrée</TabsTrigger>
            <TabsTrigger value="decrease" className="gap-1"><Minus className="h-3 w-3" /> Sortie</TabsTrigger>
            <TabsTrigger value="exact" className="gap-1"><Hash className="h-3 w-3" /> Exact</TabsTrigger>
          </TabsList>

          <TabsContent value="increase" className="space-y-3 mt-3">
            <div>
              <Label>Quantité à ajouter</Label>
              <Input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Nouveau stock: <span className="font-semibold text-success">{product.stock + quantity}</span>
            </p>
          </TabsContent>

          <TabsContent value="decrease" className="space-y-3 mt-3">
            <div>
              <Label>Quantité à retirer</Label>
              <Input type="number" min={1} max={product.stock} value={quantity} onChange={e => setQuantity(+e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Nouveau stock: <span className={`font-semibold ${product.stock - quantity < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {product.stock - quantity}
              </span>
            </p>
          </TabsContent>

          <TabsContent value="exact" className="space-y-3 mt-3">
            <div>
              <Label>Nouvelle valeur de stock</Label>
              <Input type="number" min={0} value={exactValue} onChange={e => setExactValue(+e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Changement: <span className="font-semibold">{exactValue - product.stock > 0 ? '+' : ''}{exactValue - product.stock} {product.unit}</span>
            </p>
          </TabsContent>
        </Tabs>

        <div>
          <Label>Raison (optionnel)</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Inventaire, réception..." />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? 'Mise à jour...' : 'Confirmer'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
