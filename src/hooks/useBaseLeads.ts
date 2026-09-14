// ── Backward compatibility wrapper ──
// This hook now delegates to the unified useLeads hook.
// Import from here if you need LeadInBase type or base-specific operations.
// Prefer importing directly from useLeads for new code.

import { useEffect } from 'react'
import { useLeads, LeadInBase } from './useLeads'
import { Lead } from '@/types/lead'

export type { LeadInBase }

export const useBaseLeads = (userId: string | null) => {
  const {
    baseLeads,
    trashedLeads,
    baseLoading,
    fetchBaseLeads,
    addLeadToBase,
    trashLead,
    restoreBaseLead,
    permanentDelete,
    updateLeadStatus,
    reprocessLead,
    batchReprocessLead,
  } = useLeads()

  // Auto-fetch when userId changes
  useEffect(() => {
    if (userId) fetchBaseLeads(userId)
  }, [userId, fetchBaseLeads])

  return {
    baseLeads,
    trashedLeads,
    loading: baseLoading,
    addLeadToBase: (lead: Lead) => addLeadToBase(lead, userId),
    removeLeadFromBase: (leadId: string) => trashLead(leadId, userId),
    trashLead: (leadId: string) => trashLead(leadId, userId),
    restoreLead: (leadId: string) => restoreBaseLead(leadId, userId),
    permanentDelete: (leadId: string) => permanentDelete(leadId, userId),
    updateLeadStatus: (leadId: string, newStatus: Lead['status']) => updateLeadStatus(leadId, newStatus, userId),
    reprocessLead,
    batchReprocessLead,
    refetch: () => userId ? fetchBaseLeads(userId) : Promise.resolve(),
  }
}
