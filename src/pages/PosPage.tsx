import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote,
  Building2, AlertTriangle, Check, Percent, Hash, ScanBarcode, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CheckoutDialog from '@/components/pos/CheckoutDialog';

// ── Types ──
interface PosItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  tva_rate: number;
  stock: number;
  unit: string;
}

type PaymentMethod = 'cash' | 'card' | 'virement';
type DiscountType = 'percent' | 'fixed';

// ── Main POS Component ──
export default function PosPage() {
  const { clients, products, addInvoice, addClient, addProduct, categories, refresh } = useData();
  const { role, companyId } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  // State
  const [items, setItems] = useState<PosItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('all');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [passagerId, setPassagerId] = useState<string | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', contact_person: '',
    payment_terms: 'Paiement à 30 jours', status: 'active' as string,
  });
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', selling_price: 0, purchase_price: 0, stock: 0, min_stock: 5, unit: 'pièce', tva_rate: 19,
    product_type: 'finished_product' as string, category_type: 'normal' as string, supplier_id: null as string | null,
    category_id: null as string | null,
  });
  const emptyProductForm = {
    name: '', description: '', selling_price: 0, purchase_price: 0, stock: 0, min_stock: 5, unit: 'pièce', tva_rate: 19,
    product_type: 'finished_product' as string, category_type: 'normal' as string, supplier_id: null as string | null,
    category_id: null as string | null,
  };

  const GOVERNORATES = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte',
    'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
    'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine',
    'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
  ];
  const LEGAL_FORMS = [
    { value: 'personne_physique', label: 'Personne physique' },
    { value: 'suarl', label: 'SUARL' },
    { value: 'sarl', label: 'SARL' },
    { value: 'sa', label: 'SA' },
    { value: 'sas', label: 'SAS' },
    { value: 'snc', label: 'SNC' },
    { value: 'autre', label: 'Autre' },
  ];
  const emptyClientForm = {
    name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', contact_person: '',
    payment_terms: 'Paiement à 30 jours', status: 'active' as string,
  };

  const handleNewClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addClient({
      name: clientForm.name,
      legal_form: clientForm.legal_form as any,
      matricule_fiscal: clientForm.matricule_fiscal || null,
      code_tva: clientForm.code_tva || null,
      rne: clientForm.rne || null,
      address: clientForm.address || null,
      governorate: clientForm.governorate || null,
      phone: clientForm.phone || null,
      email: clientForm.email || null,
      contact_person: clientForm.contact_person || null,
      payment_terms: clientForm.payment_terms || null,
      status: clientForm.status as any,
      is_archived: false,
    });
    if (result) {
      setSelectedClientId(result.id);
      toast({ title: `Client "${result.name}" créé et sélectionné` });
    }
    setClientForm({ ...emptyClientForm });
    setNewClientOpen(false);
  };

  const handleNewProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addProduct({
      name: productForm.name,
      description: productForm.description || null,
      selling_price: productForm.selling_price,
      purchase_price: productForm.purchase_price,
      stock: productForm.stock,
      min_stock: productForm.min_stock,
      unit: productForm.unit,
      tva_rate: productForm.tva_rate,
      product_type: productForm.product_type as any,
      category_type: productForm.category_type as any,
      supplier_id: productForm.supplier_id,
      category_id: productForm.category_id,
    });
    if (result) {
      addProductToOrder(result.id);
      toast({ title: `Produit "${result.name}" créé et ajouté` });
    }
    setProductForm({ ...emptyProductForm });
    setNewProductOpen(false);
  };

  // ── Auto-create or reuse "Passager" client ──
  useEffect(() => {
    const ensurePassager = async () => {
      if (!companyId) return;

      // Query DB directly to find existing Passager client
      const { data: existingRows } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', 'Passager')
        .eq('is_archived', false)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        setPassagerId(existingRows[0].id);
        if (!selectedClientId) setSelectedClientId(existingRows[0].id);
      } else {
        const result = await addClient({
          name: 'Passager',
          legal_form: 'personne_physique' as any,
          matricule_fiscal: null,
          code_tva: null,
          rne: null,
          address: null,
          governorate: null,
          phone: null,
          email: null,
          contact_person: null,
          payment_terms: null,
          status: 'active' as any,
          is_archived: false,
        });
        if (result) {
          setPassagerId(result.id);
          if (!selectedClientId) setSelectedClientId(result.id);
        }
      }
    };
    ensurePassager();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculations ──
  const subtotalHT = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const tvaTotal = useMemo(() => items.reduce((s, i) => s + (i.quantity * i.unit_price * i.tva_rate) / 100, 0), [items]);
  const grossTotal = subtotalHT + tvaTotal;
  const discountAmount = discountType === 'percent'
    ? (grossTotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, grossTotal - discountAmount);
  const change = amountReceived - total;
  const isPartial = paymentMethod === 'cash' && amountReceived > 0 && amountReceived < total;

  const profitMargin = useMemo(() => {
    if (!isAdmin) return 0;
    return items.reduce((s, i) => s + (i.unit_price - i.purchase_price) * i.quantity, 0);
  }, [items, isAdmin]);

  // ── Product filtering ──
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // ── Client filtering ──
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  // ── Add product to order ──
  const addProductToOrder = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setItems(prev => {
      const existing = prev.find(i => i.product_id === productId);
      if (existing) {
        return prev.map(i =>
          i.product_id === productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
        purchase_price: product.purchase_price,
        tva_rate: product.tva_rate,
        stock: product.stock,
        unit: product.unit,
      }];
    });
  }, [products]);

  // ── Barcode handler ──
  const handleBarcodeInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = (e.target as HTMLInputElement).value.trim();
      if (!code) return;
      const product = products.find(p => p.name.toLowerCase() === code.toLowerCase() || p.id === code);
      if (product) {
        addProductToOrder(product.id);
        (e.target as HTMLInputElement).value = '';
        toast({ title: `${product.name} ajouté` });
      } else {
        toast({ title: 'Produit non trouvé', variant: 'destructive' });
      }
    }
  }, [products, addProductToOrder, toast]);

  // ── Quantity controls ──
  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        productSearchRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
      if (e.key === 'F8' && items.length > 0) {
        e.preventDefault();
        setCheckoutOpen(true);
      }
      if (e.key === 'Escape') {
        setCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items.length]);

  // ── Checkout ──
  const handleCheckout = async () => {
    if (items.length === 0 || !selectedClientId) return;

    // Fetch fresh stock from DB before validating
    const productIds = items.filter(i => i.product_id).map(i => i.product_id);
    const { data: freshProducts } = await supabase
      .from('products')
      .select('id, stock, name')
      .in('id', productIds);
    const freshMap = new Map((freshProducts ?? []).map(p => [p.id, p]));

    const insufficientItems = items.filter(i => {
      const fresh = freshMap.get(i.product_id);
      return fresh ? i.quantity > fresh.stock : false;
    });
    if (insufficientItems.length > 0) {
      toast({
        title: 'Stock insuffisant',
        description: insufficientItems.map(i => {
          const fresh = freshMap.get(i.product_id);
          return `${i.product_name}: ${fresh?.stock ?? 0} dispo`;
        }).join(', '),
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const paidAmount = paymentMethod === 'cash'
        ? Math.min(amountReceived, total)
        : total;
      const status = paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

      await addInvoice({
        type: 'facture',
        date: new Date().toISOString().split('T')[0],
        client_id: selectedClientId,
        client_name: client?.name || 'Passager',
        items: items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tva_rate: i.tva_rate,
          total: i.quantity * i.unit_price,
        })),
        status,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        notes: `POS - ${paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte' : 'Virement'}${discountAmount > 0 ? ` | Remise: ${discountAmount.toFixed(3)} TND` : ''}`,
      });

      toast({
        title: '✅ Vente enregistrée',
        description: `Total: ${total.toFixed(3)} TND — ${status === 'paid' ? 'Payée' : 'Partielle'}`,
      });

      // Reset
      setItems([]);
      setDiscountValue(0);
      setAmountReceived(0);
      setCheckoutOpen(false);
      setPaymentMethod('cash');
      if (passagerId) setSelectedClientId(passagerId);
    } catch (err) {
      toast({ title: 'Erreur lors de la validation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDT = (n: number) => n.toFixed(3) + ' TND';

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 overflow-auto lg:overflow-hidden">
      {/* ═══ LEFT: Product Selection ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[50vh] lg:min-h-0 overflow-hidden">
        {/* Client selector */}
        <Card className="mb-3 shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Client</Label>
                <div className="flex items-center gap-1">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Rechercher client..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      {filteredClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setNewClientOpen(true)}
                    title="Nouveau client"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Barcode input */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  <ScanBarcode className="h-3 w-3 inline mr-1" />
                  Scanner / Code (F4)
                </Label>
                <Input
                  ref={barcodeRef}
                  placeholder="Scanner code-barres..."
                  className="h-9 text-xs"
                  onKeyDown={handleBarcodeInput}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Client Modal */}
        <Dialog open={newClientOpen} onOpenChange={o => { setNewClientOpen(o); if (!o) setClientForm({ ...emptyClientForm }); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
            <form onSubmit={handleNewClientSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Raison sociale *</Label><Input required value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div>
                  <Label>Forme juridique</Label>
                  <Select value={clientForm.legal_form} onValueChange={v => setClientForm(f => ({ ...f, legal_form: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEGAL_FORMS.map(lf => <SelectItem key={lf.value} value={lf.value}>{lf.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={clientForm.status} onValueChange={v => setClientForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Matricule fiscal</Label><Input value={clientForm.matricule_fiscal} onChange={e => setClientForm(f => ({ ...f, matricule_fiscal: e.target.value }))} /></div>
                <div><Label>Code TVA</Label><Input value={clientForm.code_tva} onChange={e => setClientForm(f => ({ ...f, code_tva: e.target.value }))} /></div>
                <div className="col-span-2"><Label>RNE</Label><Input value={clientForm.rne} onChange={e => setClientForm(f => ({ ...f, rne: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Adresse</Label><Input value={clientForm.address} onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div>
                  <Label>Gouvernorat</Label>
                  <Select value={clientForm.governorate} onValueChange={v => setClientForm(f => ({ ...f, governorate: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Téléphone</Label><Input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Personne de contact</Label><Input value={clientForm.contact_person} onChange={e => setClientForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Conditions de paiement</Label><Input value={clientForm.payment_terms} onChange={e => setClientForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Product Modal */}
        <Dialog open={newProductOpen} onOpenChange={o => { setNewProductOpen(o); if (!o) setProductForm({ ...emptyProductForm }); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
            <form onSubmit={handleNewProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nom *</Label><Input required value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Description</Label><Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Prix de vente *</Label><Input type="number" step="0.001" min="0" required value={productForm.selling_price || ''} onChange={e => setProductForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Prix d'achat</Label><Input type="number" step="0.001" min="0" value={productForm.purchase_price || ''} onChange={e => setProductForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Stock initial</Label><Input type="number" min="0" value={productForm.stock || ''} onChange={e => setProductForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label>Stock minimum</Label><Input type="number" min="0" value={productForm.min_stock || ''} onChange={e => setProductForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} /></div>
                <div>
                  <Label>Unité</Label>
                  <Select value={productForm.unit} onValueChange={v => setProductForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pièce">Pièce</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="litre">Litre</SelectItem>
                      <SelectItem value="mètre">Mètre</SelectItem>
                      <SelectItem value="boîte">Boîte</SelectItem>
                      <SelectItem value="carton">Carton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>TVA (%)</Label>
                  <Select value={String(productForm.tva_rate)} onValueChange={v => setProductForm(f => ({ ...f, tva_rate: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="13">13%</SelectItem>
                      <SelectItem value="19">19%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Product search */}
        <div className="relative mb-3 shrink-0 flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={productSearchRef}
              placeholder="Rechercher un produit... (F2)"
              className="pl-9 h-10"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setNewProductOpen(true)}
            title="Nouveau produit"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredProducts.map(p => {
              const isLowStock = p.stock <= p.min_stock;
              const isOutOfStock = p.stock <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => !isOutOfStock && addProductToOrder(p.id)}
                  disabled={isOutOfStock}
                  className={`
                    relative text-left rounded-lg border p-3 transition-all duration-200
                    ${isOutOfStock
                      ? 'bg-muted/50 border-border opacity-50 cursor-not-allowed'
                      : isLowStock
                        ? 'bg-card border-warning/40 hover:border-warning hover:shadow-md cursor-pointer active:scale-[0.97]'
                        : 'bg-card border-border hover:border-primary hover:shadow-md cursor-pointer active:scale-[0.97] hover:-translate-y-0.5'
                    }
                  `}
                >
                  <p className="text-sm font-semibold truncate text-foreground">{p.name}</p>
                  <p className="text-lg font-bold text-primary mt-1 tabular-nums">{formatDT(p.selling_price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge
                      variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'}
                      className={`text-[10px] px-2 py-0.5 font-semibold tabular-nums ${
                        isLowStock && !isOutOfStock ? 'bg-warning/15 text-warning border-warning/30' : ''
                      }`}
                    >
                      {isOutOfStock ? '⛔ Rupture' : `📦 ${p.stock} ${p.unit}`}
                    </Badge>
                    {isLowStock && !isOutOfStock && (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning animate-pulse" />
                    )}
                  </div>
                  {isAdmin && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                      Marge: {formatDT(p.selling_price - p.purchase_price)}
                    </p>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                Aucun produit trouvé
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Order Card ═══ */}
      <Card className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col overflow-hidden shadow-lg">
        <CardHeader className="pb-2 px-4 pt-4 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Commande
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </Badge>
              )}
            </CardTitle>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setItems([])}>
                <Trash2 className="h-3 w-3 mr-1" /> Vider
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-4 pb-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aucun article</p>
              <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const overStock = item.quantity > item.stock;
                return (
                  <div
                    key={item.product_id}
                    className={`rounded-lg border p-3 transition-all duration-200 ${overStock ? 'border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive' : 'border-border hover:border-primary/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDT(item.unit_price)} / {item.unit}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.product_id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, quantity: val } : i));
                          }}
                          className="h-7 w-14 text-center text-sm px-1"
                        />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold">{formatDT(item.quantity * item.unit_price)}</p>
                    </div>
                    {overStock && (
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Stock: {item.stock} — Excès: {item.quantity - item.stock}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* ── Totals & Checkout ── */}
        <div className="border-t border-border px-4 py-3 mt-auto shrink-0 space-y-2 bg-card">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <Select value={discountType} onValueChange={v => setDiscountType(v as DiscountType)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent"><Percent className="h-3 w-3 inline mr-1" />%</SelectItem>
                <SelectItem value="fixed"><Hash className="h-3 w-3 inline mr-1" />TND</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              step={discountType === 'percent' ? 1 : 0.001}
              max={discountType === 'percent' ? 100 : grossTotal}
              value={discountValue || ''}
              onChange={e => setDiscountValue(+e.target.value)}
              placeholder="Remise"
              className="h-8 text-xs flex-1"
            />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total HT</span>
              <span>{formatDT(subtotalHT)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA</span>
              <span>{formatDT(tvaTotal)}</span>
            </div>
              {discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Remise</span>
                <span>-{formatDT(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>Total TTC</span>
              <span className="text-primary tabular-nums text-xl">{formatDT(total)}</span>
            </div>
            {isAdmin && profitMargin > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Marge brute</span>
                <span className="text-success">{formatDT(profitMargin)}</span>
              </div>
            )}
          </div>

          <Button
            className="w-full h-12 text-base font-semibold gap-2"
            disabled={items.length === 0}
            onClick={() => {
              setAmountReceived(0);
              setCheckoutOpen(true);
            }}
          >
            <CreditCard className="h-5 w-5" />
            Encaisser (F8)
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            F2: Recherche • F4: Scanner • F8: Encaisser
          </p>
        </div>
      </Card>

      {/* ═══ Checkout Dialog ═══ */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={total}
        tvaTotal={tvaTotal}
        itemCount={items.reduce((s, i) => s + i.quantity, 0)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        submitting={submitting}
        onCheckout={handleCheckout}
        formatDT={formatDT}
      />
    </div>
  );
}
