export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'status-paid',
    unpaid: 'status-unpaid',
    partial: 'status-partial',
    brouillon: 'bg-muted text-muted-foreground',
    'envoyé': 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
    'accepté': 'status-paid',
    'expiré': 'status-unpaid',
  };
  const labels: Record<string, string> = {
    paid: 'Payée',
    unpaid: 'Impayée',
    partial: 'Partielle',
    brouillon: 'Brouillon',
    'envoyé': 'Envoyé',
    'accepté': 'Accepté',
    'expiré': 'Expiré',
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-muted text-muted-foreground'}`}>{labels[status] || status}</span>;
}
