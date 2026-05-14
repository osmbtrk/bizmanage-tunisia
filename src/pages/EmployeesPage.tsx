import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import * as employeesApi from '@/services/api/employees';
import { fetchActivityLogs } from '@/services/api/activityLogs';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardBody,
  Chip,
  Avatar,
  Checkbox,
  Tooltip,
  Divider,
} from '@heroui/react';
import { toast } from '@/hooks/use-toast';
import { Plus, Users, BarChart3, CalendarDays, Trash2, Edit, Activity, DollarSign, Clock, LogIn, LogOut } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const formatTND = (n: number) => n.toFixed(3) + ' TND';

const roleOptions = [
  { value: 'admin', label: 'Administrateur', color: 'danger' as const },
  { value: 'cashier', label: 'Caissier', color: 'primary' as const },
  { value: 'accountant', label: 'Comptable', color: 'secondary' as const },
  { value: 'employee', label: 'Employé', color: 'default' as const },
];

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

export default function EmployeesPage() {
  const { companyId } = useAuth();
  const { invoices } = useData();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const formModal = useDisclosure();
  const detailModal = useDisclosure();
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
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName(''); setRole('employee'); setPhone(''); setEmail('');
    setBaseSalary(0); setCommissionType('percentage'); setCommissionValue(0);
    setCreateAccount(false); setAccountPassword('');
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

  const openNew = () => { resetForm(); formModal.onOpen(); };

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    setFullName(emp.full_name);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setBaseSalary(Number(emp.base_salary) || 0);
    setCommissionType(emp.commission_type || 'percentage');
    setCommissionValue(Number(emp.commission_value) || 0);
    setCreateAccount(false);
    setAccountPassword('');
    formModal.onOpen();
  };

  const openDetail = (emp: any) => { setSelectedEmployee(emp); detailModal.onOpen(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !fullName.trim()) return;
    setSubmitting(true);
    try {
      if (editEmployee) {
        const { error } = await employeesApi.updateEmployee(editEmployee.id, {
          full_name: fullName, role, phone, email,
          base_salary: baseSalary, commission_type: commissionType, commission_value: commissionValue,
        });
        if (error) throw error;
        toast({ title: 'Employé modifié' });
      } else {
        let linkedUserId: string | null = null;
        if (createAccount && email && accountPassword) {
          const { data: accountData, error: authError } = await employeesApi.createEmployeeAccount({
            email, password: accountPassword, full_name: fullName,
            role: (role as 'admin' | 'cashier' | 'accountant' | 'employee'),
          });
          if (authError || (accountData as any)?.error) {
            const msg = authError?.message || (accountData as any)?.error || 'Erreur création compte';
            toast({ title: 'Erreur compte', description: msg, variant: 'destructive' });
            setSubmitting(false);
            return;
          }
          linkedUserId = (accountData as any)?.user_id ?? null;
          toast({ title: 'Compte utilisateur créé', description: `${email} peut désormais se connecter.` });
        }
        const { error } = await employeesApi.insertEmployee({
          company_id: companyId, full_name: fullName, role,
          phone: phone || undefined, email: email || undefined,
          base_salary: baseSalary, commission_type: commissionType, commission_value: commissionValue,
          user_id: linkedUserId,
        });
        if (error) throw error;
        toast({ title: 'Employé ajouté' });
      }
      formModal.onClose(); resetForm(); load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await employeesApi.deleteEmployee(deleteId);
    setDeleteId(null); load();
    toast({ title: 'Employé supprimé' });
  };

  const handleCheckIn = async (employeeId: string, date: string) => {
    if (!companyId) return;
    const now = new Date().toISOString();
    await employeesApi.upsertAttendance({ company_id: companyId, employee_id: employeeId, date, status: 'present', check_in: now });
    load();
    toast({ title: 'Pointage entrée enregistré' });
  };

  const handleCheckOut = async (employeeId: string, date: string) => {
    if (!companyId) return;
    const now = new Date().toISOString();
    const existing = attendance.find((a: any) => a.employee_id === employeeId && a.date === date);
    await employeesApi.upsertAttendance({
      company_id: companyId, employee_id: employeeId, date, status: 'present',
      check_in: existing?.check_in || now, check_out: now,
    });
    load();
    toast({ title: 'Pointage sortie enregistré' });
  };

  const markAttendance = async (employeeId: string, date: string, status: string) => {
    if (!companyId) return;
    await employeesApi.upsertAttendance({ company_id: companyId, employee_id: employeeId, date, status });
    load();
  };

  const calcWorkingHours = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '—';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (diff <= 0) return '—';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h${String(m).padStart(2, '0')}`;
  };

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

  const performanceChart = useMemo(() => performance.map(p => ({
    name: p.full_name.split(' ')[0],
    revenue: Math.round(p.revenue),
    commission: Math.round(p.commission),
  })), [performance]);

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

  const todayStr = new Date().toISOString().split('T')[0];

  const monthlyHours = useMemo(() => {
    const map: Record<string, number> = {};
    attendance.forEach((a: any) => {
      if (a.check_in && a.check_out) {
        const diff = new Date(a.check_out).getTime() - new Date(a.check_in).getTime();
        if (diff > 0) map[a.employee_id] = (map[a.employee_id] || 0) + diff / 3600000;
      }
    });
    return map;
  }, [attendance]);

  const actionLabels: Record<string, string> = {
    created_invoice: 'Facture créée',
    deleted_invoice: 'Facture supprimée',
    modified_stock: 'Stock modifié',
    created_expense: 'Dépense créée',
    pos_checkout: 'Vente POS',
    created_return: 'Retour créé',
  };

  const roleMeta = (r: string) => roleOptions.find(o => o.value === r) || roleOptions[3];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ressources Humaines</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos équipes, performances et présences</p>
        </div>
        <Button color="primary" onPress={openNew} startContent={<Plus className="h-4 w-4" />}>
          Nouvel employé
        </Button>
      </div>

      <Tabs aria-label="Sections RH" variant="underlined" color="primary">
        {/* EMPLOYEES TAB */}
        <Tab key="employees" title={<div className="flex items-center gap-1.5"><Users className="h-4 w-4" />Employés</div>}>
          <div className="space-y-4 pt-2">
            {employees.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {employees.filter(e => e.is_active).slice(0, 6).map((emp: any) => {
                  const meta = roleMeta(emp.role);
                  return (
                    <Card key={emp.id} isPressable onPress={() => openDetail(emp)} className="hover:scale-[1.02] transition-transform">
                      <CardBody className="flex flex-row items-center gap-3 p-4">
                        <Avatar name={getInitials(emp.full_name)} size="md" color={meta.color} isBordered />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium truncate">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.email || emp.phone || '—'}</p>
                          <Chip size="sm" variant="flat" color={meta.color} className="mt-1">{meta.label}</Chip>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card>
              <Table aria-label="Liste des employés" removeWrapper isStriped>
                <TableHeader>
                  <TableColumn>EMPLOYÉ</TableColumn>
                  <TableColumn>RÔLE</TableColumn>
                  <TableColumn>CONTACT</TableColumn>
                  <TableColumn>SALAIRE</TableColumn>
                  <TableColumn>COMMISSION</TableColumn>
                  <TableColumn>STATUT</TableColumn>
                  <TableColumn align="end">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody isLoading={loading} loadingContent={<span>Chargement…</span>} emptyContent="Aucun employé enregistré">
                  {employees.map((emp: any) => {
                    const meta = roleMeta(emp.role);
                    return (
                      <TableRow key={emp.id} className="cursor-pointer" onClick={() => openDetail(emp)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={getInitials(emp.full_name)} size="sm" color={meta.color} />
                            <span className="font-medium">{emp.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Chip size="sm" variant="flat" color={meta.color}>{meta.label}</Chip></TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{emp.email || '—'}</div>
                            <div className="text-muted-foreground">{emp.phone || '—'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatTND(Number(emp.base_salary) || 0)}</TableCell>
                        <TableCell>
                          {Number(emp.commission_value) > 0
                            ? `${emp.commission_value}${emp.commission_type === 'percentage' ? '%' : ' TND/tx'}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="dot" color={emp.is_active ? 'success' : 'default'}>
                            {emp.is_active ? 'Actif' : 'Inactif'}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Tooltip content="Modifier">
                              <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(emp)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Supprimer" color="danger">
                              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setDeleteId(emp.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </Tab>

        {/* PERFORMANCE TAB */}
        <Tab key="performance" title={<div className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Performance</div>}>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardBody><p className="text-xs text-muted-foreground">CA total</p><p className="text-2xl font-bold mt-1">{formatTND(performance.reduce((s, p) => s + p.revenue, 0))}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-bold mt-1">{performance.reduce((s, p) => s + p.transactions, 0)}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-muted-foreground">Employés actifs</p><p className="text-2xl font-bold mt-1">{employees.filter(e => e.is_active).length}</p></CardBody></Card>
            </div>
            {performanceChart.length > 0 && (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold">Revenus par employé</h3></CardHeader>
                <CardBody className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <RechartsTooltip />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenu" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            )}
          </div>
        </Tab>

        {/* COMMISSIONS TAB */}
        <Tab key="commissions" title={<div className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" />Commissions</div>}>
          <Card className="mt-2">
            <Table aria-label="Commissions" removeWrapper>
              <TableHeader>
                <TableColumn>EMPLOYÉ</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>VALEUR</TableColumn>
                <TableColumn>REVENUS GÉNÉRÉS</TableColumn>
                <TableColumn>COMMISSION</TableColumn>
                <TableColumn>TOTAL</TableColumn>
              </TableHeader>
              <TableBody emptyContent="Aucun employé">
                {performance.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell>{emp.commission_type === 'percentage' ? 'Pourcentage' : 'Fixe par tx'}</TableCell>
                    <TableCell>{emp.commission_value}{emp.commission_type === 'percentage' ? '%' : ' TND'}</TableCell>
                    <TableCell>{formatTND(emp.revenue)}</TableCell>
                    <TableCell><Chip size="sm" color="primary" variant="flat">{formatTND(emp.commission)}</Chip></TableCell>
                    <TableCell className="font-bold">{formatTND(Number(emp.base_salary) + emp.commission)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Tab>

        {/* ATTENDANCE TAB */}
        <Tab key="attendance" title={<div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Présence</div>}>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 max-w-xs">
              <Input
                type="month"
                label="Mois"
                size="sm"
                value={attendanceMonth}
                onChange={e => setAttendanceMonth(e.target.value)}
              />
            </div>

            <Card>
              <CardHeader className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Pointage du jour — {new Date().toLocaleDateString('fr-TN')}</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {employees.filter(e => e.is_active).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun employé actif</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {employees.filter(e => e.is_active).map((emp: any) => {
                      const att = attendance.find((a: any) => a.employee_id === emp.id && a.date === todayStr);
                      const checkIn = att?.check_in;
                      const checkOut = att?.check_out;
                      const meta = roleMeta(emp.role);
                      return (
                        <div key={emp.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-content2/40">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={getInitials(emp.full_name)} size="sm" color={meta.color} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {checkIn ? `Entrée ${new Date(checkIn).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}` : 'Non pointé'}
                                {checkOut ? ` · Sortie ${new Date(checkOut).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!checkIn && (
                              <Button size="sm" variant="flat" color="success" startContent={<LogIn className="h-3 w-3" />} onPress={() => handleCheckIn(emp.id, todayStr)}>
                                Entrée
                              </Button>
                            )}
                            {checkIn && !checkOut && (
                              <Button size="sm" variant="flat" color="warning" startContent={<LogOut className="h-3 w-3" />} onPress={() => handleCheckOut(emp.id, todayStr)}>
                                Sortie
                              </Button>
                            )}
                            {checkIn && checkOut && (
                              <Chip size="sm" color="success" variant="flat">{calcWorkingHours(checkIn, checkOut)}</Chip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            {employees.length > 0 && (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold">Résumé mensuel</h3></CardHeader>
                <Divider />
                <Table aria-label="Résumé mensuel" removeWrapper>
                  <TableHeader>
                    <TableColumn>EMPLOYÉ</TableColumn>
                    <TableColumn align="end">HEURES TOTALES</TableColumn>
                    <TableColumn align="end">JOURS PRÉSENT</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: any) => {
                      const hours = monthlyHours[emp.id] || 0;
                      const daysPresent = attendance.filter((a: any) => a.employee_id === emp.id && a.status === 'present').length;
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.full_name}</TableCell>
                          <TableCell className="text-right font-mono">{hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">{daysPresent} jours</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}

            {employees.length > 0 && (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold">Calendrier (7 derniers jours)</h3></CardHeader>
                <Divider />
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 sticky left-0 bg-content1">Employé</th>
                        {daysInMonth.slice(-7).map(d => (
                          <th key={d} className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[60px]">
                            {new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', weekday: 'short' })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp: any) => (
                        <tr key={emp.id} className="border-t border-border">
                          <td className="p-2 font-medium sticky left-0 bg-content1">{emp.full_name}</td>
                          {daysInMonth.slice(-7).map(d => {
                            const att = attendance.find((a: any) => a.employee_id === emp.id && a.date === d);
                            const status = att?.status || 'absent';
                            return (
                              <td key={d} className="text-center p-1">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  radius="md"
                                  variant={status === 'present' ? 'solid' : 'flat'}
                                  color={status === 'present' ? 'success' : 'default'}
                                  onPress={() => markAttendance(emp.id, d, status === 'present' ? 'absent' : 'present')}
                                  className="min-w-8 w-8 h-8 text-xs"
                                >
                                  {status === 'present' ? 'P' : 'A'}
                                </Button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </Tab>

        {/* ACTIVITY LOG TAB */}
        <Tab key="activity" title={<div className="flex items-center gap-1.5"><Activity className="h-4 w-4" />Journal</div>}>
          <div className="space-y-2 pt-2">
            {activityLogs.length === 0 ? (
              <Card><CardBody className="text-center py-10 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-3 opacity-40" />
                <p>Aucune activité enregistrée</p>
              </CardBody></Card>
            ) : (
              activityLogs.map((log: any) => {
                const emp = employees.find(e => e.id === log.employee_id);
                const meta = emp ? roleMeta(emp.role) : roleOptions[3];
                return (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-content1">
                    <Avatar name={emp ? getInitials(emp.full_name) : '?'} size="sm" color={meta.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{emp?.full_name || 'Utilisateur'}</span>
                        <span className="text-muted-foreground"> — </span>
                        <span>{actionLabels[log.action] || log.action}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('fr-TN')} · {new Date(log.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Tab>
      </Tabs>

      {/* ADD/EDIT MODAL */}
      <Modal isOpen={formModal.isOpen} onOpenChange={formModal.onOpenChange} size="lg" scrollBehavior="inside" onClose={resetForm}>
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleSubmit}>
              <ModalHeader>{editEmployee ? 'Modifier employé' : 'Nouvel employé'}</ModalHeader>
              <ModalBody className="space-y-3">
                <Input label="Nom complet" isRequired value={fullName} onValueChange={setFullName} />
                <Select label="Rôle" selectedKeys={[role]} onChange={e => setRole(e.target.value)}>
                  {roleOptions.map(r => <SelectItem key={r.value}>{r.label}</SelectItem>)}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Téléphone" value={phone} onValueChange={setPhone} />
                  <Input label="Email" type="email" value={email} onValueChange={setEmail} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Salaire" type="number" step="0.001" value={String(baseSalary)} onValueChange={v => setBaseSalary(+v || 0)} />
                  <Select label="Type comm." selectedKeys={[commissionType]} onChange={e => setCommissionType(e.target.value)}>
                    <SelectItem key="percentage">Pourcentage</SelectItem>
                    <SelectItem key="fixed">Fixe par tx</SelectItem>
                  </Select>
                  <Input label="Valeur comm." type="number" step="0.01" value={String(commissionValue)} onValueChange={v => setCommissionValue(+v || 0)} />
                </div>

                {!editEmployee && (
                  <>
                    <Divider />
                    <Checkbox isSelected={createAccount} onValueChange={setCreateAccount}>
                      Créer un compte utilisateur
                    </Checkbox>
                    {createAccount && (
                      <div className="space-y-3 pl-1">
                        <p className="text-xs text-muted-foreground">
                          L'employé pourra se connecter avec son email. Son rôle ({roleMeta(role).label}) déterminera ses accès.
                        </p>
                        <Input
                          label="Mot de passe"
                          type="password"
                          isRequired
                          minLength={6}
                          value={accountPassword}
                          onValueChange={setAccountPassword}
                          placeholder="Min. 6 caractères"
                        />
                      </div>
                    )}
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Annuler</Button>
                <Button color="primary" type="submit" isLoading={submitting}>
                  {editEmployee ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {selectedEmployee && (() => {
            const perf = performance.find(p => p.id === selectedEmployee.id);
            const empLogs = activityLogs.filter(l => l.employee_id === selectedEmployee.id);
            const meta = roleMeta(selectedEmployee.role);
            return (
              <>
                <ModalHeader className="flex items-center gap-3">
                  <Avatar name={getInitials(selectedEmployee.full_name)} color={meta.color} isBordered />
                  <div>
                    <p>{selectedEmployee.full_name}</p>
                    <Chip size="sm" variant="flat" color={meta.color}>{meta.label}</Chip>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-content2/40"><span className="text-xs text-muted-foreground">Salaire</span><p className="font-semibold">{formatTND(Number(selectedEmployee.base_salary))}</p></div>
                    <div className="p-3 rounded-lg bg-content2/40"><span className="text-xs text-muted-foreground">CA généré</span><p className="font-semibold">{formatTND(perf?.revenue || 0)}</p></div>
                    <div className="p-3 rounded-lg bg-content2/40"><span className="text-xs text-muted-foreground">Commission</span><p className="font-semibold text-primary">{formatTND(perf?.commission || 0)}</p></div>
                    <div className="p-3 rounded-lg bg-content2/40"><span className="text-xs text-muted-foreground">Heures (mois)</span><p className="font-semibold">{(monthlyHours[selectedEmployee.id] || 0).toFixed(1)}h</p></div>
                  </div>
                  {empLogs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Activité récente</h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {empLogs.slice(0, 10).map((log: any) => (
                          <div key={log.id} className="text-xs flex justify-between p-2 bg-content2/40 rounded">
                            <span>{actionLabels[log.action] || log.action}</span>
                            <span className="text-muted-foreground">{new Date(log.created_at).toLocaleDateString('fr-TN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={detailModal.onClose}>Fermer</Button>
                  <Button color="primary" startContent={<Edit className="h-4 w-4" />} onPress={() => { detailModal.onClose(); openEdit(selectedEmployee); }}>
                    Modifier
                  </Button>
                </ModalFooter>
              </>
            );
          })()}
        </ModalContent>
      </Modal>

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
