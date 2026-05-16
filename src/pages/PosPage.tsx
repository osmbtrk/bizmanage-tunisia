import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card, CardBody, CardHeader,
  Button, Input, Select, SelectItem, Autocomplete, AutocompleteItem,
  Modal, ModalContent, ModalHeader, ModalBody,
  Drawer, DrawerContent, DrawerHeader, DrawerBody,
  Chip,
} from '@heroui/react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  AlertTriangle, Percent, Hash, ScanBarcode, X, UserPlus,
} from 'lucide-react';
import { clientsApi, productsApi } from '@/services/api';
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

export default function PosPage() {
  const { clients, products, addInvoice, addClient, addProduct, categories } = useData();
  const { role, companyId } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  // State
  const [items, setItems] = useState<PosItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('all');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [passagerId, setPassagerId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const emptyClientForm = {
    name: '', legal_form: 'personne_physique' as string, matricule_fiscal: '', code_tva: '', rne: '',
    address: '', governorate: '', phone: '', email: '', contact_person: '',
    payment_terms: 'Paiement à 30 jours', status: 'active' as string,
  };
  const [clientForm, setClientForm] = useState({ ...emptyClientForm });

  const [newProductOpen, setNewProductOpen] = useState(false);
  const emptyProductForm = {
    name: '', description: '', selling_price: 0, purchase_price: 0, stock: 0, min_stock: 5, unit: 'pièce', tva_rate: 19,
    product_type: 'finished_product' as string, category_type: 'normal' as string, supplier_id: null as string | null,
    category_id: null as string | null,
  };
  const [productForm, setProductForm] = useState({ ...emptyProductForm });

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
      const { data: existingRows } = await clientsApi.findPassagerClient(companyId);
      if (existingRows && existingRows.length > 0) {
        setPassagerId(existingRows[0].id);
        if (!selectedClientId) setSelectedClientId(existingRows[0].id);
      } else {
        const result = await addClient({
          name: 'Passager',
          legal_form: 'personne_physique' as any,
          matricule_fiscal: null, code_tva: null, rne: null,
          address: null, governorate: null, phone: null,
          email: null, contact_person: null, payment_terms: null,
          status: 'active' as any, is_archived: false,
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

  const profitMargin = useMemo(() => {
    if (!isAdmin) return 0;
    return items.reduce((s, i) => s + (i.unit_price - i.purchase_price) * i.quantity, 0);
  }, [items, isAdmin]);

  // ── Product filtering ──
  const filteredProducts = useMemo(() => {
    let result = products;
    if (posCategoryFilter !== 'all') {
      result = result.filter(p => p.category_id === posCategoryFilter);
    }
    if (!productSearch.trim()) return result;
    const q = productSearch.toLowerCase();
    return result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [products, productSearch, posCategoryFilter]);

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
      if (e.key === 'F2') { e.preventDefault(); productSearchRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === 'F8' && items.length > 0) { e.preventDefault(); setCheckoutOpen(true); }
      if (e.key === 'Escape') { setCheckoutOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items.length]);

  // ── Checkout ──
  const handleCheckout = async () => {
    if (items.length === 0 || !selectedClientId) return;
    const productIds = items.filter(i => i.product_id).map(i => i.product_id);
    const { data: freshProducts } = await productsApi.fetchProductsByIds(productIds);
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

      setItems([]);
      setDiscountValue(0);
      setAmountReceived(0);
      setCheckoutOpen(false);
      setMobileCartOpen(false);
      setPaymentMethod('cash');
      if (passagerId) setSelectedClientId(passagerId);
    } catch (err) {
      toast({ title: 'Erreur lors de la validation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDT = (n: number) => n.toFixed(3) + ' TND';
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // ─────────── Order Panel (shared between desktop column and mobile drawer) ───────────
  const OrderPanelContent = (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Aucun article</p>
            <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {items.map(item => {
              const overStock = item.quantity > item.stock;
              return (
                <div
                  key={item.product_id}
                  className={`rounded-lg border p-3 transition-all duration-200 ${
                    overStock
                      ? 'border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDT(item.unit_price)} / {item.unit}</p>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="h-6 w-6 min-w-6 text-muted-foreground hover:text-destructive"
                      onPress={() => removeItem(item.product_id)}
                      aria-label="Retirer"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button isIconOnly size="sm" variant="bordered" className="h-8 w-8 min-w-8" onPress={() => updateQuantity(item.product_id, -1)} aria-label="Diminuer">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setItems(prev => prev.map(i => i.product_id === item.product_id ? { ...i, quantity: val } : i));
                        }}
                        className="h-8 w-14 text-center text-sm px-1 rounded-md border border-border bg-background"
                      />
                      <Button isIconOnly size="sm" variant="bordered" className="h-8 w-8 min-w-8" onPress={() => updateQuantity(item.product_id, 1)} aria-label="Augmenter">
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
      </div>

      {/* Totals & Checkout */}
      <div className="border-t border-border px-4 py-3 mt-auto shrink-0 space-y-2 bg-card">
        <div className="flex items-center gap-2">
          <Select
            aria-label="Type de remise"
            selectedKeys={[discountType]}
            onSelectionChange={(keys) => setDiscountType(Array.from(keys)[0] as DiscountType)}
            variant="bordered"
            size="sm"
            className="w-24"
            classNames={{ trigger: 'h-8 min-h-8' }}
          >
            <SelectItem key="percent" startContent={<Percent className="h-3 w-3" />}>%</SelectItem>
            <SelectItem key="fixed" startContent={<Hash className="h-3 w-3" />}>TND</SelectItem>
          </Select>
          <Input
            type="number"
            min={0}
            step={discountType === 'percent' ? 1 : 0.001}
            max={discountType === 'percent' ? 100 : grossTotal}
            value={discountValue ? String(discountValue) : ''}
            onChange={e => setDiscountValue(+e.target.value)}
            placeholder="Remise"
            variant="bordered"
            size="sm"
            className="flex-1"
            classNames={{ inputWrapper: 'h-8 min-h-8' }}
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
          color="primary"
          className="w-full h-12 text-base font-semibold"
          isDisabled={items.length === 0}
          onPress={() => {
            setAmountReceived(0);
            setCheckoutOpen(true);
          }}
          startContent={<CreditCard className="h-5 w-5" />}
        >
          Encaisser (F8)
        </Button>

        <p className="text-[10px] text-center text-muted-foreground hidden lg:block">
          F2: Recherche • F4: Scanner • F8: Encaisser
        </p>
      </div>
    </>
  );

  const OrderHeader = (
    <div className="flex items-center justify-between w-full">
      <div className="text-base font-semibold flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Commande
        {items.length > 0 && (
          <Chip size="sm" variant="flat" color="primary" className="ml-1">{totalQty}</Chip>
        )}
      </div>
      {items.length > 0 && (
        <Button
          size="sm"
          variant="light"
          color="danger"
          className="text-xs"
          startContent={<Trash2 className="h-3 w-3" />}
          onPress={() => setItems([])}
        >
          Vider
        </Button>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 overflow-auto lg:overflow-hidden pb-20 lg:pb-0">
      {/* ═══ LEFT: Product Selection ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[50vh] lg:min-h-0 overflow-hidden">
        {/* Client + Scanner row */}
        <Card shadow="sm" className="mb-3 shrink-0 bg-card border border-border">
          <CardBody className="p-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1 min-w-0 flex items-end gap-1">
                <Autocomplete
                  aria-label="Client"
                  label="Client"
                  labelPlacement="outside"
                  placeholder="Sélectionner un client"
                  variant="bordered"
                  size="sm"
                  selectedKey={selectedClientId || null}
                  onSelectionChange={(key) => setSelectedClientId((key as string) || '')}
                  defaultItems={clients}
                  className="flex-1"
                >
                  {(c) => <AutocompleteItem key={c.id}>{c.name}</AutocompleteItem>}
                </Autocomplete>
                <Button
                  isIconOnly
                  variant="bordered"
                  size="sm"
                  className="h-10 w-10 min-w-10 shrink-0"
                  onPress={() => setNewClientOpen(true)}
                  aria-label="Nouveau client"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <Input
                ref={barcodeRef}
                label="Scanner / Code (F4)"
                labelPlacement="outside"
                placeholder="Scanner code-barres..."
                variant="bordered"
                size="sm"
                className="flex-1"
                startContent={<ScanBarcode className="h-4 w-4 text-muted-foreground" />}
                onKeyDown={handleBarcodeInput}
              />
            </div>
          </CardBody>
        </Card>

        {/* Product search + category filter */}
        <div className="relative mb-3 shrink-0 flex items-center gap-2">
          <Input
            ref={productSearchRef}
            placeholder="Rechercher un produit... (F2)"
            value={productSearch}
            onValueChange={setProductSearch}
            variant="bordered"
            size="sm"
            startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            className="flex-1"
            classNames={{ inputWrapper: 'h-10' }}
          />
          {categories.length > 0 && (
            <Select
              aria-label="Catégorie"
              selectedKeys={[posCategoryFilter]}
              onSelectionChange={(keys) => setPosCategoryFilter(Array.from(keys)[0] as string)}
              variant="bordered"
              size="sm"
              className="w-36 shrink-0"
              classNames={{ trigger: 'h-10 min-h-10' }}
            >
              <>
                <SelectItem key="all">Toutes</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id}>{c.name}</SelectItem>
                )) as any}
              </>
            </Select>
          )}
          <Button
            isIconOnly
            variant="bordered"
            className="h-10 w-10 min-w-10 shrink-0"
            onPress={() => setNewProductOpen(true)}
            aria-label="Nouveau produit"
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
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'default'}
                      className="text-[10px] h-5 px-2"
                    >
                      {isOutOfStock ? '⛔ Rupture' : `📦 ${p.stock} ${p.unit}`}
                    </Chip>
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

      {/* ═══ RIGHT: Order Card (desktop) ═══ */}
      <Card
        shadow="lg"
        className="hidden lg:flex w-full lg:w-[380px] xl:w-[420px] shrink-0 flex-col overflow-hidden bg-card border border-border"
      >
        <CardHeader className="pb-2 px-4 pt-4 shrink-0">{OrderHeader}</CardHeader>
        <CardBody className="flex flex-col p-0 flex-1 overflow-hidden">
          {OrderPanelContent}
        </CardBody>
      </Card>

      {/* ═══ MOBILE: floating cart bar ═══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <Button
          variant="bordered"
          className="flex-1 h-12 justify-between"
          onPress={() => setMobileCartOpen(true)}
          startContent={
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {totalQty > 0 && <Chip size="sm" color="primary" variant="flat">{totalQty}</Chip>}
            </span>
          }
        >
          <span className="font-bold text-primary tabular-nums">{formatDT(total)}</span>
        </Button>
        <Button
          color="primary"
          className="h-12 px-5 font-semibold"
          isDisabled={items.length === 0}
          onPress={() => { setAmountReceived(0); setCheckoutOpen(true); }}
          startContent={<CreditCard className="h-5 w-5" />}
        >
          Encaisser
        </Button>
      </div>

      {/* ═══ MOBILE: Cart drawer ═══ */}
      <Drawer
        isOpen={mobileCartOpen}
        onOpenChange={setMobileCartOpen}
        placement="bottom"
        size="full"
        classNames={{ base: 'lg:hidden h-[90vh] bg-background', wrapper: 'lg:hidden' }}
      >
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="border-b border-border">{OrderHeader}</DrawerHeader>
              <DrawerBody className="p-0 flex flex-col">
                {OrderPanelContent}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* ═══ New Client Modal ═══ */}
      <Modal
        isOpen={newClientOpen}
        onOpenChange={(o) => { setNewClientOpen(o); if (!o) setClientForm({ ...emptyClientForm }); }}
        size="2xl"
        scrollBehavior="inside"
        placement="center"
        classNames={{ base: 'bg-background border border-border' }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Nouveau client</ModalHeader>
              <ModalBody className="pb-6">
                <form onSubmit={handleNewClientSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input className="sm:col-span-2" label="Raison sociale" isRequired variant="bordered" size="sm" value={clientForm.name} onValueChange={v => setClientForm(f => ({ ...f, name: v }))} />
                    <Select label="Forme juridique" variant="bordered" size="sm" selectedKeys={[clientForm.legal_form]} onSelectionChange={k => setClientForm(f => ({ ...f, legal_form: Array.from(k)[0] as string }))}>
                      {LEGAL_FORMS.map(lf => <SelectItem key={lf.value}>{lf.label}</SelectItem>)}
                    </Select>
                    <Select label="Statut" variant="bordered" size="sm" selectedKeys={[clientForm.status]} onSelectionChange={k => setClientForm(f => ({ ...f, status: Array.from(k)[0] as string }))}>
                      <SelectItem key="active">Actif</SelectItem>
                      <SelectItem key="inactive">Inactif</SelectItem>
                    </Select>
                    <Input label="Matricule fiscal" variant="bordered" size="sm" value={clientForm.matricule_fiscal} onValueChange={v => setClientForm(f => ({ ...f, matricule_fiscal: v }))} />
                    <Input label="Code TVA" variant="bordered" size="sm" value={clientForm.code_tva} onValueChange={v => setClientForm(f => ({ ...f, code_tva: v }))} />
                    <Input className="sm:col-span-2" label="RNE" variant="bordered" size="sm" value={clientForm.rne} onValueChange={v => setClientForm(f => ({ ...f, rne: v }))} />
                    <Input className="sm:col-span-2" label="Adresse" variant="bordered" size="sm" value={clientForm.address} onValueChange={v => setClientForm(f => ({ ...f, address: v }))} />
                    <Select label="Gouvernorat" variant="bordered" size="sm" placeholder="Choisir..." selectedKeys={clientForm.governorate ? [clientForm.governorate] : []} onSelectionChange={k => setClientForm(f => ({ ...f, governorate: Array.from(k)[0] as string }))}>
                      {GOVERNORATES.map(g => <SelectItem key={g}>{g}</SelectItem>)}
                    </Select>
                    <Input label="Téléphone" variant="bordered" size="sm" value={clientForm.phone} onValueChange={v => setClientForm(f => ({ ...f, phone: v }))} />
                    <Input label="Email" type="email" variant="bordered" size="sm" value={clientForm.email} onValueChange={v => setClientForm(f => ({ ...f, email: v }))} />
                    <Input label="Personne de contact" variant="bordered" size="sm" value={clientForm.contact_person} onValueChange={v => setClientForm(f => ({ ...f, contact_person: v }))} />
                    <Input className="sm:col-span-2" label="Conditions de paiement" variant="bordered" size="sm" value={clientForm.payment_terms} onValueChange={v => setClientForm(f => ({ ...f, payment_terms: v }))} />
                  </div>
                  <Button type="submit" color="primary" className="w-full">Enregistrer</Button>
                </form>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ═══ New Product Modal ═══ */}
      <Modal
        isOpen={newProductOpen}
        onOpenChange={(o) => { setNewProductOpen(o); if (!o) setProductForm({ ...emptyProductForm }); }}
        size="2xl"
        scrollBehavior="inside"
        placement="center"
        classNames={{ base: 'bg-background border border-border' }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Nouveau produit</ModalHeader>
              <ModalBody className="pb-6">
                <form onSubmit={handleNewProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input className="sm:col-span-2" label="Nom" isRequired variant="bordered" size="sm" value={productForm.name} onValueChange={v => setProductForm(f => ({ ...f, name: v }))} />
                    <Input className="sm:col-span-2" label="Description" variant="bordered" size="sm" value={productForm.description} onValueChange={v => setProductForm(f => ({ ...f, description: v }))} />
                    <Input label="Prix de vente" type="number" step="0.001" min="0" isRequired variant="bordered" size="sm" value={productForm.selling_price ? String(productForm.selling_price) : ''} onChange={e => setProductForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} />
                    <Input label="Prix d'achat" type="number" step="0.001" min="0" variant="bordered" size="sm" value={productForm.purchase_price ? String(productForm.purchase_price) : ''} onChange={e => setProductForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} />
                    <Input label="Stock initial" type="number" min="0" variant="bordered" size="sm" value={productForm.stock ? String(productForm.stock) : ''} onChange={e => setProductForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
                    <Input label="Stock minimum" type="number" min="0" variant="bordered" size="sm" value={productForm.min_stock ? String(productForm.min_stock) : ''} onChange={e => setProductForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} />
                    <Select label="Unité" variant="bordered" size="sm" selectedKeys={[productForm.unit]} onSelectionChange={k => setProductForm(f => ({ ...f, unit: Array.from(k)[0] as string }))}>
                      <SelectItem key="pièce">Pièce</SelectItem>
                      <SelectItem key="kg">Kg</SelectItem>
                      <SelectItem key="litre">Litre</SelectItem>
                      <SelectItem key="mètre">Mètre</SelectItem>
                      <SelectItem key="boîte">Boîte</SelectItem>
                      <SelectItem key="carton">Carton</SelectItem>
                    </Select>
                    <Select label="TVA (%)" variant="bordered" size="sm" selectedKeys={[String(productForm.tva_rate)]} onSelectionChange={k => setProductForm(f => ({ ...f, tva_rate: parseInt(Array.from(k)[0] as string) }))}>
                      <SelectItem key="0">0%</SelectItem>
                      <SelectItem key="7">7%</SelectItem>
                      <SelectItem key="13">13%</SelectItem>
                      <SelectItem key="19">19%</SelectItem>
                    </Select>
                  </div>
                  <Button type="submit" color="primary" className="w-full">Enregistrer</Button>
                </form>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ═══ Checkout Dialog ═══ */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={total}
        tvaTotal={tvaTotal}
        itemCount={totalQty}
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
