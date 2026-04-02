import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExtractedInvoiceData {
  supplier_name?: string;
  invoice_number?: string;
  date?: string;
  due_date?: string | null;
  total_ht?: number | null;
  tva_amount?: number | null;
  total_ttc?: number;
  tva_rate?: number | null;
  items?: { product_name: string; quantity: number; unit_price: number; tva_rate: number }[];
}

interface InvoiceOCRUploadProps {
  onExtracted: (data: ExtractedInvoiceData) => void;
}

export default function InvoiceOCRUpload({ onExtracted }: InvoiceOCRUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: 'Fichier trop volumineux', description: 'Maximum 10 Mo.', variant: 'destructive' });
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Format non supporté', description: 'Utilisez un PDF, JPEG, PNG ou WebP.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-invoice`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || `Erreur ${resp.status}`);
      }

      const data: ExtractedInvoiceData = await resp.json();
      onExtracted(data);
      toast({ title: 'Données extraites', description: 'Les champs ont été pré-remplis. Vérifiez avant de sauvegarder.' });
    } catch (err: any) {
      console.error('OCR error:', err);
      toast({ title: 'Erreur extraction', description: err?.message || 'Impossible d\'extraire les données.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [onExtracted]);

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
        <span className="text-sm font-medium">
          {uploading ? 'Analyse en cours...' : 'Scanner une facture (OCR)'}
        </span>
      </div>
      {fileName && !uploading && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>{fileName}</span>
        </div>
      )}
      <Label htmlFor="ocr-upload" className="sr-only">Fichier facture</Label>
      <Input
        id="ocr-upload"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="max-w-xs mx-auto text-xs"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <p className="text-[10px] text-muted-foreground">PDF, JPEG, PNG ou WebP — max 10 Mo</p>
    </div>
  );
}
