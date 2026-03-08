import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Eye, Archive, FileDown, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DOC_LABELS: Record<string, string> = {
  facture: 'Facture',
  devis: 'Devis',
  bon_livraison: 'Bon de livraison',
  bon_commande: 'Bon de commande',
};

interface ArchiveRow {
  id: string;
  document_type: string;
  document_number: string;
  client_name: string;
  total_amount: number;
  created_at: string;
  pdf_file_url: string | null;
  created_by_user: string;
  invoice_id: string | null;
}

export default function ArchivePage() {
  const { companyId, user } = useAuth();
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [detail, setDetail] = useState<ArchiveRow | null>(null);
  const [detailHtml, setDetailHtml] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const fetchHtmlContent = async (url: string) => {
    try {
      const res = await fetch(url);
      return await res.text();
    } catch { return ''; }
  };

  const handleView = async (arc: ArchiveRow) => {
    setDetail(arc);
    if (arc.pdf_file_url) {
      const html = await fetchHtmlContent(arc.pdf_file_url);
      setDetailHtml(html);
    } else {
      setDetailHtml('');
    }
  };

  const handleDownloadPdf = async (arc: ArchiveRow) => {
    if (!arc.pdf_file_url) return;
    const html = await fetchHtmlContent(arc.pdf_file_url);
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const fetchArchives = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('archives')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setArchives((data as ArchiveRow[]) ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchArchives(); }, [fetchArchives]);

  const years = useMemo(() => {
    const ySet = new Set(archives.map(a => new Date(a.created_at).getFullYear()));
    return Array.from(ySet).sort((a, b) => b - a);
  }, [archives]);

  const filtered = useMemo(() => {
    return archives.filter(a => {
      if (search && !a.client_name.toLowerCase().includes(search.toLowerCase()) && !a.document_number.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && a.document_type !== typeFilter) return false;
      const d = new Date(a.created_at);
      if (yearFilter !== 'all' && d.getFullYear() !== Number(yearFilter)) return false;
      if (monthFilter !== 'all' && (d.getMonth() + 1) !== Number(monthFilter)) return false;
      return true;
    });
  }, [archives, search, typeFilter, yearFilter, monthFilter]);

  const formatDT = (n: number) => Number(n).toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });

  const handleExportZip = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      for (const arc of filtered) {
        if (!arc.pdf_file_url) continue;
        try {
          const res = await fetch(arc.pdf_file_url);
          const blob = await res.blob();
          zip.file(`${arc.document_number}.html`, blob);
        } catch { /* skip failed downloads */ }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const label = typeFilter !== 'all' ? typeFilter : 'tous';
      const yearLabel = yearFilter !== 'all' ? yearFilter : 'toutes-annees';
      saveAs(content, `archive-${label}-${yearLabel}.zip`);
    } finally {
      setExporting(false);
    }
  };

  const docTypeBadgeColor = (t: string) => {
    switch (t) {
      case 'facture': return 'default';
      case 'devis': return 'secondary';
      case 'bon_livraison': return 'outline';
      case 'bon_commande': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Archive className="h-6 w-6" />
          Archive Numérique
        </h1>
        <Button variant="outline" onClick={handleExportZip} disabled={exporting || filtered.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Exporter ZIP
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par client ou numéro..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="facture">Factures</SelectItem>
            <SelectItem value="devis">Devis</SelectItem>
            <SelectItem value="bon_livraison">Bons de livraison</SelectItem>
            <SelectItem value="bon_commande">Bons de commande</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Année" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes années</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous mois</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {new Date(2000, i).toLocaleString('fr', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="mx-auto h-12 w-12 mb-3 opacity-40" />
          <p>Aucun document archivé</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground">
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Numéro</th>
                  <th className="text-left p-3 font-medium">Client</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(arc => (
                  <tr key={arc.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Badge variant={docTypeBadgeColor(arc.document_type) as any}>
                        {DOC_LABELS[arc.document_type] || arc.document_type}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">{arc.document_number}</td>
                    <td className="p-3">{arc.client_name}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatDT(arc.total_amount)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(arc.created_at).toLocaleDateString('fr-TN')}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(arc)} title="Voir">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {arc.pdf_file_url && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(arc)} title="Télécharger PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={o => { if (!o) { setDetail(null); setDetailHtml(''); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Archive className="h-5 w-5" />
                  {detail.document_number}
                  <Badge variant={docTypeBadgeColor(detail.document_type) as any}>
                    {DOC_LABELS[detail.document_type] || detail.document_type}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Client</p>
                    <p className="font-medium mt-1">{detail.client_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Montant</p>
                    <p className="font-medium mt-1">{formatDT(detail.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Date</p>
                    <p className="font-medium mt-1">{new Date(detail.created_at).toLocaleDateString('fr-TN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Type</p>
                    <p className="font-medium mt-1">{DOC_LABELS[detail.document_type]}</p>
                  </div>
                </div>

                {/* Document Preview */}
                {detailHtml && (
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    <iframe
                      srcDoc={detailHtml}
                      className="w-full h-[500px]"
                      title="Aperçu du document"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {detail.pdf_file_url && (
                    <Button variant="outline" className="flex-1" onClick={() => handleDownloadPdf(detail)}>
                      <Download className="h-4 w-4 mr-2" /> Télécharger en PDF
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
