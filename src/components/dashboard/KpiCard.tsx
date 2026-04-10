import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  valueHT?: string;
  valueTTC?: string;
  value?: string;
  sub?: string;
  color: string;
  trend?: number;
}

export default function KpiCard({ icon: Icon, label, value, valueHT, valueTTC, sub, color, trend }: KpiCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-secondary ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span className={`flex items-center text-xs font-semibold ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {(valueHT || valueTTC) ? (
            <div className="mt-1 space-y-0.5">
              {valueTTC && <p className="text-lg font-bold tabular-nums">{valueTTC}</p>}
              {valueHT && <p className="text-xs text-muted-foreground tabular-nums">HT: {valueHT}</p>}
            </div>
          ) : (
            <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
          )}
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
