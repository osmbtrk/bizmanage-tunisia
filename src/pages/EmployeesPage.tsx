import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import * as employeesApi from '@/services/api/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Users, BarChart3, CalendarDays, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

const formatTND = (n: number) => n.toFixed(3) + ' TND';

export default function EmployeesPage() {
  const { companyId } = useAuth();
  const { invoices } = useData();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));

  // Form
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Employé');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [empRes, attRes] = await Promise.all([
      employeesApi.fetchEmployees(companyId),
      employeesApi.fetchAttendance(companyId, attendanceMonth),
    ]);
    setEmployees(empRes.data ?? []);
    setAttendance(attRes.data ?? []);
    setLoading(false);
  }, [companyId, attendanceMonth]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !fullName.trim()) return;
    setSubmitting(true);
    const { error } = await employeesApi.insertEmployee({
      company_id: companyId,
      full_name: fullName,
      role,
      phone: phone || undefined,
      email: email || undefined,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Employé ajouté' });
      setDialogOpen(false);
      setFullName(''); setRole('Employé'); setPhone(''); setEmail('');
      load();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await employeesApi.deleteEmployee(deleteId);
    setDeleteId(null);
    load();
    toast({ title: 'Employé supprimé' });
  };

  const markAttendance = async (employeeId: string, date: string, status: string) => {
    if (!companyId) return;
    await employeesApi.upsertAttendance({
      company_id: companyId,
      employee_id: employeeId,
      date,
      status,
    });
    load();
  };

  // Performance data
  const performance = useMemo(() => {
    // Since we don't track which employee created which invoice,
    // show general stats per employee count
    const factures = invoices.filter(i => i.type === 'facture');
    const totalRevenue = factures.reduce((s, i) => s + Number(i.total), 0);
    const totalTransactions = factures.length;
    return { totalRevenue, totalTransactions, avgPerEmployee: employees.length > 0 ? totalRevenue / employees.length : 0 };
  }, [invoices, employees]);

  // Generate days for current month
  const daysInMonth = useMemo(() => {
    const [y, m] = attendanceMonth.split('-').map(Number);
    const days: string[] = [];
    const daysCount = new Date(y, m, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dateStr <= today) days.push(dateStr);
    }
    return days;
  }, [attendanceMonth]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ressources Humaines</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel employé
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="mr-1.5 h-4 w-4" />Employés</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="mr-1.5 h-4 w-4" />Performance</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarDays className="mr-1.5 h-4 w-4" />Présence</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Chargement...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-40" />
              <p>Aucun employé enregistré</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Embauché le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>{emp.phone || '—'}</TableCell>
                      <TableCell>{emp.email || '—'}</TableCell>
                      <TableCell>{new Date(emp.hire_date).toLocaleDateString('fr-TN')}</TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                          {emp.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(emp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chiffre d'affaires total</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatTND(performance.totalRevenue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nombre de transactions</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{performance.totalTransactions}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA moyen / employé</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatTND(performance.avgPerEmployee)}</p></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Répartition par employé</CardTitle></CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ajoutez des employés pour voir les statistiques</p>
              ) : (
                <div className="space-y-3">
                  {employees.map((emp: any) => {
                    const share = performance.avgPerEmployee;
                    return (
                      <div key={emp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium text-sm">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.role}</p>
                        </div>
                        <p className="font-semibold tabular-nums">{formatTND(share)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Mois :</Label>
            <Input type="month" value={attendanceMonth} onChange={e => setAttendanceMonth(e.target.value)} className="w-48" />
          </div>

          {employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Ajoutez des employés pour gérer la présence</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10">Employé</TableHead>
                    {daysInMonth.slice(-7).map(d => (
                      <TableHead key={d} className="text-center text-xs min-w-[60px]">
                        {new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', weekday: 'short' })}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{emp.full_name}</TableCell>
                      {daysInMonth.slice(-7).map(d => {
                        const att = attendance.find((a: any) => a.employee_id === emp.id && a.date === d);
                        const status = att?.status || 'absent';
                        return (
                          <TableCell key={d} className="text-center p-1">
                            <button
                              onClick={() => markAttendance(emp.id, d, status === 'present' ? 'absent' : 'present')}
                              className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                                status === 'present'
                                  ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
                                  : status === 'holiday'
                                  ? 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {status === 'present' ? 'P' : status === 'holiday' ? 'F' : 'A'}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><Label>Nom complet *</Label><Input required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div><Label>Rôle</Label><Input value={role} onChange={e => setRole(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => { if (!o) setDeleteId(null); }}
        title="Supprimer cet employé ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
      />
    </div>
  );
}
