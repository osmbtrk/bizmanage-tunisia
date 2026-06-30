import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from '@heroui/react';
import { Plus, Trash2, Search, AlertTriangle, Package, Pencil, Layers, BoxIcon, Settings2, FileSpreadsheet } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import StockAdjustDialog from '@/components/products/StockAdjustDialog';
import CustomAttributesEditor from '@/components/products/CustomAttributesEditor';
import AttributeSchemaManager from '@/components/products/AttributeSchemaManager';
import ProductExcelImport from '@/components/products/ProductExcelImport';
import { bomApi, productAttributesApi } from '@/services/api';
import type { DbAttributeSchema } from '@/services/api/productAttributes';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type DbProduct = Database['public']['Tables']['products']['Row'];
type DbProductCategory = Database['public']['Tables']['product_categories']['Row'];

const emptyForm = {
  name: '', description: '', purchase_price: 0, selling_price: 0,
  tva_rate: 19, stock: 0, min_stock: 5, unit: 'pièce',
  product_type: 'finished_product' as string, category_type: 'normal' as string,
  supplier_id: '' as string, category_id: '' as string,
  custom_attributes: {} as Record<string, any>,
};

function HierarchicalCategorySelect({
  categories,
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  categories: DbProductCategory[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const topLevel = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const items: { key: string; label: React.ReactNode }[] = [{ key: '_none', label: 'Aucune' }];
  for (const cat of topLevel) {
    items.push({ key: cat.id, label: cat.name });
    for (const child of getChildren(cat.id)) {
      items.push({ key: child.id, label: <span className="ml-3">└ {child.name}</span> });
      for (const gc of getChildren(child.id)) {
        items.push({ key: gc.id, label: <span className="ml-6">└ {gc.name}</span> });
      }
    }
  }

  return (
    <Select
      label={label}
      labelPlacement={label ? 'outside' : undefined}
      placeholder={placeholder || 'Aucune'}
      selectedKeys={[value || '_none']}
      onSelectionChange={(keys) => {
        const v = Array.from(keys)[0] as string;
        onChange(v === '_none' ? '' : (v || ''));
      }}
      className={className}
    >
      {items.map(it => <SelectItem key={it.key}>{it.label as any}</SelectItem>)}
    </Select>
  );
}

function ProductFormFields({
  form,
  setForm,
  categories,
  suppliers,
  attributeSchemas,
}: {
  form: typeof emptyForm;
  setForm: (fn: (f: typeof emptyForm) => typeof emptyForm) => void;
  categories: DbProductCategory[];
  suppliers: { id: string; name: string }[];
  attributeSchemas: DbAttributeSchema[];
}) {
  return (
    <>
      <Input label="Nom" labelPlacement="outside" placeholder="Nom du produit" isRequired value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))} />
      <Input label="Description" labelPlacement="outside" placeholder="Description" value={form.description} onValueChange={v => setForm(f => ({ ...f, description: v }))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Type"
          labelPlacement="outside"
          selectedKeys={[form.product_type]}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            if (v) setForm(f => ({ ...f, product_type: v }));
          }}
        >
          <SelectItem key="finished_product">Produit fini</SelectItem>
          <SelectItem key="raw_material">Matière première</SelectItem>
          <SelectItem key="service">Service</SelectItem>
        </Select>
        <HierarchicalCategorySelect
          label="Catégorie"
          categories={categories}
          value={form.category_id}
          onChange={v => setForm(f => ({ ...f, category_id: v }))}
        />
      </div>
      {form.product_type === 'raw_material' && (
        <Select
          label="Fournisseur"
          labelPlacement="outside"
          placeholder="Sélectionner un fournisseur"
          selectedKeys={[form.supplier_id || '_none']}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            setForm(f => ({ ...f, supplier_id: v === '_none' ? '' : (v || '') }));
          }}
        >
          {[<SelectItem key="_none">Aucun</SelectItem>, ...suppliers.map(s => <SelectItem key={s.id}>{s.name}</SelectItem>)] as any}
        </Select>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Prix d'achat (TND)" labelPlacement="outside" type="number" step="0.001" min={0} value={String(form.purchase_price)} onValueChange={v => setForm(f => ({ ...f, purchase_price: +v }))} />
        <Input label="Prix de vente (TND)" labelPlacement="outside" type="number" step="0.001" min={0} value={String(form.selling_price)} onValueChange={v => setForm(f => ({ ...f, selling_price: +v }))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="TVA %"
          labelPlacement="outside"
          selectedKeys={[String(form.tva_rate)]}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            if (v) setForm(f => ({ ...f, tva_rate: +v }));
          }}
        >
          <SelectItem key="0">0%</SelectItem>
          <SelectItem key="7">7%</SelectItem>
          <SelectItem key="13">13%</SelectItem>
          <SelectItem key="19">19%</SelectItem>
        </Select>
        <Input label="Stock" labelPlacement="outside" type="number" min={0} value={String(form.stock)} onValueChange={v => setForm(f => ({ ...f, stock: +v }))} />
        <Input label="Stock min" labelPlacement="outside" type="number" min={0} value={String(form.min_stock)} onValueChange={v => setForm(f => ({ ...f, min_stock: +v }))} />
      </div>
      <Input label="Unité" labelPlacement="outside" value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))} />
      <CustomAttributesEditor
        schemas={attributeSchemas}
        values={form.custom_attributes}
        onChange={(next) => setForm(f => ({ ...f, custom_attributes: next }))}
        categoryId={form.category_id || null}
      />
    </>
  );
}

export default function ProductsPage() {
  const { products, addProduct, deleteProduct, updateProduct, suppliers, categories } = useData();
  const { companyId, role } = useAuth();
  const { toast } = useToast();
  const [stockAdjustProduct, setStockAdjustProduct] = useState<DbProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<DbProduct | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bomOpen, setBomOpen] = useState(false);
  const [bomProductId, setBomProductId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<{ raw_material_id: string; quantity: number; unit_type: string }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [attributeSchemas, setAttributeSchemas] = useState<DbAttributeSchema[]>([]);
  const [schemaManagerOpen, setSchemaManagerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadSchemas = async () => {
    if (!companyId) return;
    const { data } = await productAttributesApi.fetchAttributeSchemas(companyId);
    setAttributeSchemas((data as any) || []);
  };
  useEffect(() => { loadSchemas(); }, [companyId]);

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => typeFilter === 'all' || p.product_type === typeFilter)
    .filter(p => categoryFilter === 'all' || p.category_id === categoryFilter);

  const rawMaterials = products.filter(p => p.product_type === 'raw_material');

  const getCategoryPath = (catId: string | null): string | null => {
    if (!catId) return null;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return null;
    if (cat.parent_id) {
      const parent = getCategoryPath(cat.parent_id);
      return parent ? `${parent} › ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct({
      ...form,
      description: form.description || null,
      supplier_id: form.supplier_id || null,
      category_id: form.category_id || null,
      product_type: form.product_type as any,
      category_type: form.category_type as any,
    } as any);
    setForm({ ...emptyForm });
    setOpen(false);
  };

  const openEditDialog = (p: DbProduct) => {
    setEditProduct(p);
    setEditForm({
      name: p.name,
      description: p.description || '',
      purchase_price: Number(p.purchase_price),
      selling_price: Number(p.selling_price),
      tva_rate: p.tva_rate,
      stock: p.stock,
      min_stock: p.min_stock,
      unit: p.unit,
      product_type: p.product_type,
      category_type: p.category_type,
      supplier_id: p.supplier_id || '',
      category_id: p.category_id || '',
      custom_attributes: (p.custom_attributes as Record<string, any>) || {},
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    await updateProduct(editProduct.id, {
      name: editForm.name,
      description: editForm.description || null,
      purchase_price: editForm.purchase_price,
      selling_price: editForm.selling_price,
      tva_rate: editForm.tva_rate,
      stock: editForm.stock,
      min_stock: editForm.min_stock,
      unit: editForm.unit,
      product_type: editForm.product_type as any,
      category_type: editForm.category_type as any,
      supplier_id: editForm.supplier_id || null,
      category_id: editForm.category_id || null,
      custom_attributes: editForm.custom_attributes,
    } as any);
    toast({ title: 'Produit mis à jour' });
    setEditOpen(false);
    setEditProduct(null);
  };

  const openBom = async (productId: string) => {
    setBomProductId(productId);
    const { data } = await bomApi.fetchBomItems(productId);
    setBomItems((data ?? []).map(b => ({ raw_material_id: b.raw_material_id, quantity: Number(b.quantity), unit_type: b.unit_type })));
    setBomOpen(true);
  };

  const saveBom = async () => {
    if (!bomProductId) return;
    await bomApi.replaceBomItems(
      bomProductId,
      bomItems.map(b => ({ raw_material_id: b.raw_material_id, quantity: b.quantity, unit_type: b.unit_type }))
    );
    toast({ title: 'Nomenclature enregistrée' });
    setBomOpen(false);
  };

  const typeLabels: Record<string, string> = { finished_product: 'Produit fini', raw_material: 'Matière 1ère', service: 'Service' };

  return (
    <div className="animate-fade-in w-full max-w-full min-w-0 overflow-x-hidden">

      <div className="page-header">
        <h1 className="page-title">Produits & Stock</h1>
        <div className="flex flex-wrap gap-2">
          {role === 'admin' && (
            <>
              <Button variant="bordered" startContent={<Settings2 className="h-4 w-4" />} onPress={() => setSchemaManagerOpen(true)}>
                Attributs
              </Button>
              <Button variant="bordered" startContent={<FileSpreadsheet className="h-4 w-4" />} onPress={() => setImportOpen(true)}>
                Importer Excel
              </Button>
            </>
          )}
          <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => setOpen(true)}>
            Nouveau produit
          </Button>
        </div>
      </div>

      <Modal isDismissable={false} isOpen={open} onOpenChange={setOpen} size="lg" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          <ModalHeader>Ajouter un produit</ModalHeader>
          <ModalBody className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <ProductFormFields form={form} setForm={setForm} categories={categories} suppliers={suppliers} attributeSchemas={attributeSchemas} />
              <Button type="submit" color="primary" className="w-full">Enregistrer</Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      {companyId && (
        <>
          <AttributeSchemaManager open={schemaManagerOpen} onOpenChange={setSchemaManagerOpen} companyId={companyId} onChanged={loadSchemas} />
          <ProductExcelImport open={importOpen} onOpenChange={setImportOpen} companyId={companyId} attributeSchemas={attributeSchemas} />
        </>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <Input
          placeholder="Rechercher un produit..."
          startContent={<Search className="h-4 w-4 text-muted-foreground" />}
          value={search}
          onValueChange={setSearch}
          variant="bordered"
          className="flex-1 min-w-[200px]"
        />
        <Select
          aria-label="Type"
          variant="bordered"
          selectedKeys={[typeFilter]}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            if (v) setTypeFilter(v);
          }}
          className="w-44"
        >
          <SelectItem key="all">Tous les types</SelectItem>
          <SelectItem key="finished_product">Produit fini</SelectItem>
          <SelectItem key="raw_material">Matière première</SelectItem>
          <SelectItem key="service">Service</SelectItem>
        </Select>
        {categories.length > 0 && (
          <HierarchicalCategorySelect
            categories={categories}
            value={categoryFilter === 'all' ? '' : categoryFilter}
            onChange={v => setCategoryFilter(v || 'all')}
            className="w-52"
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
        <Table aria-label="Produits" removeWrapper isStriped>
          <TableHeader>
            <TableColumn>PRODUIT</TableColumn>
            <TableColumn>TYPE</TableColumn>
            <TableColumn>CATÉGORIE</TableColumn>
            <TableColumn>PRIX VENTE</TableColumn>
            <TableColumn>TVA</TableColumn>
            <TableColumn>STOCK</TableColumn>
            <TableColumn> </TableColumn>
          </TableHeader>
          <TableBody>
            {filtered.map(p => {
              const catPath = getCategoryPath(p.category_id);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="bordered">{typeLabels[p.product_type] || p.product_type}</Chip>
                  </TableCell>
                  <TableCell>
                    {catPath ? <Chip size="sm" variant="flat">{catPath}</Chip> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{Number(p.selling_price).toFixed(3)} TND</TableCell>
                  <TableCell>{p.tva_rate}%</TableCell>
                  <TableCell>
                    <Button
                      variant="light"
                      size="sm"
                      className={`gap-1 ${p.stock <= p.min_stock ? 'text-warning font-semibold' : ''}`}
                      onPress={() => setStockAdjustProduct(p)}
                      startContent={p.stock <= p.min_stock ? <AlertTriangle className="h-3.5 w-3.5" /> : <BoxIcon className="h-3 w-3" />}
                    >
                      {p.stock} {p.unit}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip content="Modifier">
                        <Button isIconOnly variant="light" size="sm" onPress={() => openEditDialog(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      {p.product_type === 'finished_product' && (
                        <Tooltip content="Nomenclature (BOM)">
                          <Button isIconOnly variant="light" size="sm" onPress={() => openBom(p.id)}>
                            <Layers className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      )}
                      <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => setDeleteTarget(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Edit Product Modal */}
      <Modal isDismissable={false} isOpen={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditProduct(null); } }} size="lg" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          <ModalHeader>Modifier le produit</ModalHeader>
          <ModalBody className="pb-6">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <ProductFormFields form={editForm} setForm={setEditForm} categories={categories} suppliers={suppliers} attributeSchemas={attributeSchemas} />
              <Button type="submit" color="primary" className="w-full">Enregistrer les modifications</Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* BOM Modal */}
      <Modal isDismissable={false} isOpen={bomOpen} onOpenChange={setBomOpen} size="2xl" scrollBehavior="inside" backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2"><Layers className="h-5 w-5" /> Nomenclature (BOM)</ModalHeader>
          <ModalBody className="pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">Définir les matières premières nécessaires pour fabriquer ce produit.</p>
            {bomItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Select
                    label="Matière première"
                    labelPlacement="outside"
                    size="sm"
                    selectedKeys={item.raw_material_id ? [item.raw_material_id] : []}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys)[0] as string;
                      if (v) setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, raw_material_id: v } : b));
                    }}
                  >
                    {rawMaterials.map(rm => <SelectItem key={rm.id}>{rm.name}</SelectItem>)}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input label="Quantité" labelPlacement="outside" size="sm" type="number" step="0.01" min={0} value={String(item.quantity)} onValueChange={v => setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, quantity: +v } : b))} />
                </div>
                <div className="col-span-3">
                  <Select
                    label="Type"
                    labelPlacement="outside"
                    size="sm"
                    selectedKeys={[item.unit_type]}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys)[0] as string;
                      if (v) setBomItems(prev => prev.map((b, i) => i === idx ? { ...b, unit_type: v } : b));
                    }}
                  >
                    <SelectItem key="fixed">Fixe</SelectItem>
                    <SelectItem key="percentage">%</SelectItem>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button isIconOnly variant="light" size="sm" onPress={() => setBomItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="bordered" size="sm" onPress={() => setBomItems(prev => [...prev, { raw_material_id: rawMaterials[0]?.id || '', quantity: 1, unit_type: 'fixed' }])} isDisabled={rawMaterials.length === 0} startContent={<Plus className="h-3 w-3" />}>
              Ajouter matière
            </Button>
            {rawMaterials.length === 0 && <p className="text-xs text-muted-foreground">Créez d'abord des produits de type "Matière première"</p>}
            <Button color="primary" className="w-full" onPress={saveBom}>Enregistrer la nomenclature</Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer ce produit ?"
        description="Le produit sera supprimé définitivement. Cette action est irréversible."
        onConfirm={() => { if (deleteTarget) { deleteProduct(deleteTarget); setDeleteTarget(null); } }}
      />

      <StockAdjustDialog
        product={stockAdjustProduct}
        open={!!stockAdjustProduct}
        onOpenChange={(o) => { if (!o) setStockAdjustProduct(null); }}
      />
    </div>
  );
}
