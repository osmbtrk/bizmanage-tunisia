export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { paid: 'status-paid', unpaid: 'status-unpaid', partial: 'status-partial' };
  const labels: Record<string, string> = { paid: 'Payée', unpaid: 'Impayée', partial: 'Partielle' };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
