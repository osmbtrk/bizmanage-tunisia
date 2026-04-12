import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/services/api/activityLogs';

export function useActivityLog() {
  const { user, companyId } = useAuth();

  const log = useCallback(
    async (action: string, entityType?: string, entityId?: string, details?: Record<string, any>) => {
      if (!companyId || !user) return;
      await logActivity({
        company_id: companyId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });
    },
    [companyId, user]
  );

  return { log };
}
