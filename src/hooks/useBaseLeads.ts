import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import { Lead } from '@/types/lead'

export interface LeadInBase extends Lead {
  addedToBaseAt: string
}

export const useBaseLeads = (userId: string | null) => {
  const [baseLeads, setBaseLeads] = useState<LeadInBase[]>([])
  const [loading, setLoading] = useState(false)

  const fetchBaseLeads = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('base_leads')
        .select('*')
        .eq('user_id', userId)
        .order('added_to_base_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const mapped: LeadInBase[] = data.map((row: any) => ({
          id: row.lead_id || row.id,
          name: row.nome || row.name || 'Lead',
          email: row.email || 'N/A',
          phone: row.telefone || row.phone || '',
          age: row.idade || row.age || null,
          city: row.cidade || row.city || '',
          plan: row.nicho || row.plan || 'Individual',
          status: row.status || 'new',
          score: row.score || 70,
          source: row.fonte || row.source || 'website',
          created_at: row.created_at || row.added_to_base_at || new Date().toISOString(),
          addedToBaseAt: row.added_to_base_at || new Date().toISOString(),
        }))
        setBaseLeads(mapped)
      }
    } catch (err) {
      console.warn('Erro ao carregar base do Supabase, usando estado local:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchBaseLeads()
  }, [fetchBaseLeads])

  const addLeadToBase = useCallback(async (lead: Lead) => {
    if (baseLeads.some(l => l.id === lead.id)) return false

    const leadInBase: LeadInBase = {
      ...lead,
      addedToBaseAt: new Date().toISOString()
    }

    setBaseLeads(prev => [...prev, leadInBase])

    if (userId) {
      try {
        await supabase.from('base_leads').insert({
          user_id: userId,
          lead_id: lead.id,
          nome: lead.name,
          telefone: lead.phone,
          cidade: lead.city,
          nicho: lead.plan,
          email: lead.email,
          idade: lead.age,
          score: lead.score,
          status: lead.status,
          fonte: lead.source,
          added_to_base_at: leadInBase.addedToBaseAt
        })
      } catch (err) {
        console.warn('Erro ao salvar no Supabase (mantido local):', err)
      }
    }
    return true
  }, [baseLeads, userId])

  const removeLeadFromBase = useCallback(async (leadId: string) => {
    setBaseLeads(prev => prev.filter(l => l.id !== leadId))

    if (userId) {
      try {
        await supabase
          .from('base_leads')
          .delete()
          .eq('lead_id', leadId)
          .eq('user_id', userId)
      } catch (err) {
        console.warn('Erro ao remover do Supabase:', err)
      }
    }
  }, [userId])

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: Lead['status']) => {
    setBaseLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l)
    )

    if (userId) {
      try {
        await supabase
          .from('base_leads')
          .update({ status: newStatus })
          .eq('lead_id', leadId)
          .eq('user_id', userId)
      } catch (err) {
        console.warn('Erro ao atualizar status no Supabase:', err)
      }
    }
  }, [userId])

  return {
    baseLeads,
    loading,
    addLeadToBase,
    removeLeadFromBase,
    updateLeadStatus,
    refetch: fetchBaseLeads
  }
}
