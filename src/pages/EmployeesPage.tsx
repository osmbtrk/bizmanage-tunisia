import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import * as employeesApi from '@/services/api/employees';
import { fetchActivityLogs } from '@/services/api/activityLogs';
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
import { Plus, Users, BarChart3, CalendarDays, Trash2, Edit, Activity, DollarSign, TrendingUp } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const formatTND = (n: number) => n.toFixed(3) + ' TND';

const roleOptions = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'cashier', label: 'Caissier' },
  { value: 'accountant', label: 'Comptable' },
  { value: 'employee', label: 'Employé' },
];

export default function EmployeesPage() {
  const { companyId } = useAuth();
  const { invoices } = useData();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));

  // Form
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [commissionType, setCommissionType] = useState('percentage');
  const [commissionValue, setCommissionValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName(''); setRole('employee'); setPhone(''); setEmail('');
    setBaseSalary(0); setCommissionType('percentage'); setCommissionValue(0);
    setEditEmployee(null);
  };

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [empRes, attRes, logRes] = await Promise.all([
      employeesApi.fetchEmployees(companyId),
      employeesApi.fetchAttendance(companyId, attendanceMonth),
      fetchActivityLogs(companyId, { limit: 100 }),
    ]);
    setEmployees(empRes.data ?? []);
    setAttendance(attRes.data ?? []);
    setActivityLogs(logRes.data ?? []);
    setLoading(false);
  }, [companyId, attendanceMonth]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    setFullName(emp.full_name);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setBaseSalary(Number(emp.base_salary) || 0);
    setCommissionType(emp.commission_type || 'percentage');
    setCommissionValue(Number(emp.commission_value) || 0);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !fullName.trim()) return;
    setSubmitting(true);

    if (editEmployee) {
      const { error } = await employeesApi.updateEmployee(editEmployee.id, {
        full_name: fullName, role, phone, email,
        base_salary: baseSalary, commission_type: commissionType, commission_value: commissionValue,
      });
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Employé modifié' }); setDialogOpen(false); resetForm(); load(); }
    } else {
      const { error } = await employeesApi.insertEmployee({
        company_id: companyId, full_name: fullName, role,
        phone: phone || undefined, email: email || undefined,
        base_salary: baseSalary, commission_type: commissionType, commission_value: commissionValue,
      });
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Employé ajouté' }); setDialogOpen(false); resetForm(); load(); }
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await employeesApi.deleteEmployee(deleteId);
    setDeleteId(null); load();
    toast({ title: 'Employé supprimé' });
  };

  const markAttendance = async (employeeId: string, date: string, status: string) => {
    if (!companyId) return;
    await employeesApi.upsertAttendance({ company_id: companyId, employee_id: employeeId, date, status });
    load();
  };

  // Performance: revenue per employee (placeholder — would need employee_id on invoices for real tracking)
  const performance = useMemo(() => {
    const factures = invoices.filter(i => i.type === 'facture');
    const totalRevenue = factures.reduce((s, i) => s + Number(i.total), 0);
    const totalTransactions = factures.length;
    return employees.map(emp => {
      const share = employees.length > 0 ? totalRevenue / employees.length : 0;
      const txns = employees.length > 0 ? Math.round(totalTransactions / employees.length) : 0;
      const commission = emp.commission_type === 'percentage'
        ? share * (Number(emp.commission_value) / 100)
        : Number(emp.commission_value) * txns;
      return { ...emp, revenue: share, transactions: txns, commission };
    });
  }, [invoices, employees]);

  const performanceChart = useMemo(() => {
    return performance.map(p => ({
      name: p.full_name.split(' ')[0],
      revenue: Math.round(p.revenue),
      commission: Math.round(p.commission),
    }));
  }, [performance]);

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

  const actionLabels: Record<string, string> = {
    created_invoice: 'Facture créée',
    deleted_invoice: 'Facture supprimée',
    modified_stock: 'Stock modifié',
    created_expense: 'Dépense créée',
    pos_checkout: 'Vente POS',
    created_return: 'Retour créé',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ressources Humaines</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel employé
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="mr-1.5 h-4 w-4" />Employés</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="mr-1.5 h-4 w-4" />Performance</TabsTrigger>
          <TabsTrigger value="commissions"><DollarSign className="mr-1.5 h-4 w-4" />Commissions</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarDays className="mr-1.5 h-4 w-4" />Présence</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="mr-1.5 h-4 w-4" />Journal</TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
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
                    <TableHead>Salaire</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: any) => (
                    <TableRow key={emp.id} className="cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleOptions.find(r => r.value === emp.role)?.label || emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.phone || '—'}</TableCell>
                      <TableCell>{emp.email || '—'}</TableCell>
                      <TableCell>{formatTND(Number(emp.base_salary) || 0)}</TableCell>
                      <TableCell>
                        {Number(emp.commission_value) > 0
                          ? `${emp.commission_value}${emp.commission_type === 'percentage' ? '%' : ' TND/tx'}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                          {emp.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(emp); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(emp.id); }}>
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

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA total</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatTND(performance.reduce((s, p) => s + p.revenue, 0))}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{performance.reduce((s, p) => s + p.transactions, 0)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Employés actifs</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{employees.filter(e => e.is_active).length}</p></CardContent>
            </Card>
          </div>
          {performanceChart.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Revenus par employé</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenu" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Revenus générés</TableHead>
                  <TableHead>Commission calculée</TableHead>
                  <TableHead>Total (Salaire + Commission)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell>{emp.commission_type === 'percentage' ? 'Pourcentage' : 'Fixe par tx'}</TableCell>
                    <TableCell>{emp.commission_value}{emp.commission_type === 'percentage' ? '%' : ' TND'}</TableCell>
                    <TableCell>{formatTND(emp.revenue)}</TableCell>
                    <TableCell className="font-semibold text-primary">{formatTND(emp.commission)}</TableCell>
                    <TableCell className="font-bold">{formatTND(Number(emp.base_salary) + emp.commission)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
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

        {/* ACTIVITY LOG TAB */}
        <TabsContent value="activity" className="space-y-4">
          {activityLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="mx-auto h-12 w-12 mb-3 opacity-40" />
              <p>Aucune activité enregistrée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activityLogs.map((log: any) => {
                const emp = employees.find(e => e.id === log.employee_id);
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{emp?.full_name || 'Utilisateur'}</span>
                        {' — '}
                        <span>{actionLabels[log.action] || log.action}</span>
                        {log.entity_id && <span className="text-muted-foreground"> ({log.entity_type} #{log.entity_id?.slice(0, 8)})</span>}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {JSON.stringify(log.details).slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('fr-TN')} {new Date(log.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); resetForm(); } else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEmployee ? 'Modifier employé' : 'Nouvel employé'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nom complet *</Label><Input required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div>
              <Label>Rôle</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Salaire de base</Label><Input type="number" step="0.001" value={baseSalary} onChange={e => setBaseSalary(+e.target.value)} /></div>
              <div>
                <Label>Type commission</Label>
                <Select value={commissionType} onValueChange={setCommissionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage</SelectItem>
                    <SelectItem value="fixed">Fixe par tx</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valeur commission</Label><Input type="number" step="0.01" value={commissionValue} onChange={e => setCommissionValue(+e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Enregistrement...' : editEmployee ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE DETAIL DIALOG */}
      <Dialog open={!!selectedEmployee} onOpenChange={o => { if (!o) setSelectedEmployee(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedEmployee && (() => {
            const perf = performance.find(p => p.id === selectedEmployee.id);
            const empLogs = activityLogs.filter(l => l.employee_id === selectedEmployee.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {selectedEmployee.full_name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Rôle</span><p className="font-medium">{roleOptions.find(r => r.value === selectedEmployee.role)?.label}</p></div>
                    <div><span className="text-muted-foreground">Salaire</span><p className="font-medium">{formatTND(Number(selectedEmployee.base_salary))}</p></div>
                    <div><span className="text-muted-foreground">CA généré</span><p className="font-medium">{formatTND(perf?.revenue || 0)}</p></div>
                    <div><span className="text-muted-foreground">Commission</span><p className="font-medium text-primary">{formatTND(perf?.commission || 0)}</p></div>
                  </div>
                  {empLogs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Activité récente</h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {empLogs.slice(0, 10).map((log: any) => (
                          <div key={log.id} className="text-xs flex justify-between p-2 bg-muted/50 rounded">
                            <span>{actionLabels[log.action] || log.action}</span>
                            <span className="text-muted-foreground">{new Date(log.created_at).toLocaleDateString('fr-TN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
