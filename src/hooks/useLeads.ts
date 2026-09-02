import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/supabase/client'
import { Lead, FilterOptions } from '@/types/lead'

export { supabase }

const mapFromSupabase = (dbLead: any): Lead => ({
  id: dbLead.id,
  name: dbLead.nome || dbLead.name || 'Lead sem nome',
  email: dbLead.email || 'N/A',
  phone: dbLead.telefone || dbLead.phone || '(00) 00000-0000',
  age: dbLead.idade || dbLead.age || 30,
  plan: dbLead.plano || dbLead.nicho || dbLead.plan || 'Individual',
  status: dbLead.status || 'new',
  score: dbLead.score || 70,
  city: dbLead.cidade || dbLead.city || 'São Paulo',
  source: dbLead.fonte || dbLead.source || 'website',
  created_at: dbLead.created_at || new Date().toISOString(),
  enriched_data: dbLead.enriched_data || null,
  website: dbLead.website || null,
  cnpj: dbLead.cnpj || null,
  responsavel: dbLead.responsavel || null,
})

export const useLeads = (customFilters?: FilterOptions) => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({} as FilterOptions)
  const hasFetchedOnce = useRef(false)

  const activeFilters = { ...filters, ...customFilters }

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: supabaseError } = await supabase
        .from('leads')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (supabaseError) throw supabaseError

      const mappedLeads = (data || []).map(mapFromSupabase)

      let resultLeads = mappedLeads
      if (activeFilters.city) {
        resultLeads = resultLeads.filter((lead: Lead) => lead.city === activeFilters.city)
      }

      setLeads(resultLeads)
      setError(null)
      hasFetchedOnce.current = true
    } catch (err) {
      console.error('Erro Supabase:', err)
      if (!hasFetchedOnce.current) {
        setError('Erro de conexao com Supabase.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [customFilters?.city, customFilters?.plan, customFilters?.minAge, customFilters?.maxAge])

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    deleteLead: async (leadId: string) => {
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', leadId)
      if (error) {
        // Fallback: if deleted_at column doesn't exist, hard delete
        if (error.message?.includes('deleted_at') || error.message?.includes('column')) {
          const { error: delError } = await supabase.from('leads').delete().eq('id', leadId)
          if (delError) throw delError
        } else {
          throw error
        }
      }
      setLeads(prev => prev.filter(l => l.id !== leadId))
    },
    deleteMultipleLeads: async (ids: string[]) => {
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).in('id', ids)
      if (error) {
        if (error.message?.includes('deleted_at') || error.message?.includes('column')) {
          const { error: delError } = await supabase.from('leads').delete().in('id', ids)
          if (delError) throw delError
        } else {
          throw error
        }
      }
      setLeads(prev => prev.filter(l => !ids.includes(l.id)))
    },
    restoreLead: async (leadId: string) => {
      const { error } = await supabase.from('leads').update({ deleted_at: null }).eq('id', leadId)
      if (error) throw error
    },
    fetchDeleted: async () => {
      const { data, error } = await supabase.from('leads').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
      if (error) throw error
      return (data || []).map(mapFromSupabase)
    },
    hardDeleteLead: async (leadId: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', leadId)
      if (error) throw error
    },
    filters,
    setFilters
  }
}
