import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopClientsProps {
  clients: { name: string; total: number }[];
  formatDT: (n: number) => string;
}

export default function TopClients({ clients, formatDT }: TopClientsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top 5 clients
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Pas encore de ventes</p>
        ) : (
          <div className="space-y-3">
            {clients.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[140px]">{c.name}</span>
                </div>
                <span className="text-sm font-semibold">{formatDT(c.total)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
