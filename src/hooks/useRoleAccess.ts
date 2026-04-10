import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'employee' | 'cashier' | 'accountant';

// Define which routes each role can access
const rolePermissions: Record<AppRole, string[]> = {
  admin: ['*'], // full access
  employee: ['*'], // full access (same as admin for now)
  cashier: ['/', '/pos', '/retours'],
  accountant: ['/', '/factures', '/devis', '/paiements', '/retours', '/clients', '/depenses', '/taxes', '/archives', '/analytiques', '/factures-fournisseurs', '/fournisseurs'],
};

export function useRoleAccess() {
  const { role } = useAuth();
  const currentRole = (role as AppRole) || 'employee';

  const canAccess = (path: string): boolean => {
    const perms = rolePermissions[currentRole];
    if (!perms) return false;
    if (perms.includes('*')) return true;
    return perms.some(p => path === p || (p !== '/' && path.startsWith(p)));
  };

  return { role: currentRole, canAccess };
}
