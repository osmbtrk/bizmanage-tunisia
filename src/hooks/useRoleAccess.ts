import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'employee' | 'cashier' | 'accountant';

const rolePermissions: Record<AppRole, string[]> = {
  admin: ['*'],
  employee: ['*'],
  cashier: ['/', '/dashboard', '/pos', '/retours'],
  accountant: ['/', '/dashboard', '/factures', '/devis', '/paiements', '/retours', '/clients', '/depenses', '/taxes', '/declarations', '/archives', '/analytiques', '/factures-fournisseurs', '/fournisseurs'],
};

export function useRoleAccess() {
  const { functionalRole } = useAuth();
  const currentRole: AppRole = functionalRole;

  const canAccess = (path: string): boolean => {
    const perms = rolePermissions[currentRole];
    if (!perms) return false;
    if (perms.includes('*')) return true;
    return perms.some(p => path === p || (p !== '/' && p !== '/dashboard' && path.startsWith(p)));
  };

  const isAdmin = currentRole === 'admin';

  return { role: currentRole, canAccess, isAdmin };
}
