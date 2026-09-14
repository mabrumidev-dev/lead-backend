import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import { Lead, FilterOptions } from '@/types/lead'

export { supabase }

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Local storage keys ──
const TRASH_KEY = 'mabrumi_trashed_leads'

export interface LeadInBase extends Lead {
  addedToBaseAt: string
  deletedAt?: string | null
  enriched_data?: any
}

function loadTrashedIds(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '{}') } catch { return {} }
}
function saveTrashedIds(ids: Record<string, string>) {
  try { localStorage.setItem(TRASH_KEY, JSON.stringify(ids)) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
}

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

const mapToLeadInBase = (dbLead: any, trashedIds: Record<string, string>): LeadInBase => {
  const lead = mapFromSupabase(dbLead)
  return {
    ...lead,
    addedToBaseAt: dbLead.saved_at || dbLead.created_at || new Date().toISOString(),
    deletedAt: trashedIds[lead.id] || dbLead.deleted_at || null,
  }
}

export const useLeads = (customFilters?: FilterOptions) => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({} as FilterOptions)
  const hasFetchedOnce = useRef(false)
  const leadsRef = useRef<Lead[]>([])

  const activeFilters = { ...filters, ...customFilters }

  const fetchLeads = useCallback(async () => {
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
      leadsRef.current = resultLeads
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
  }, [customFilters?.city, customFilters?.plan, customFilters?.minAge, customFilters?.maxAge])

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { leadsRef.current = leads }, [leads])

  // ── CRUD Operations ──

  const deleteLead = useCallback(async (leadId: string) => {
    const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', leadId)
    if (error) {
      if (error.message?.includes('deleted_at') || error.message?.includes('column')) {
        const lead = leadsRef.current.find(l => l.id === leadId)
        if (lead) {
          const trash = JSON.parse(localStorage.getItem('crm_trash') || '[]')
          trash.push({ ...lead, deleted_at: new Date().toISOString() })
          localStorage.setItem('crm_trash', JSON.stringify(trash))
        }
        const { error: delError } = await supabase.from('leads').delete().eq('id', leadId)
        if (delError) throw delError
      } else { throw error }
    }
    setLeads(prev => prev.filter(l => l.id !== leadId))
  }, [])

  const deleteMultipleLeads = useCallback(async (ids: string[]) => {
    const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) {
      if (error.message?.includes('deleted_at') || error.message?.includes('column')) {
        const trash = JSON.parse(localStorage.getItem('crm_trash') || '[]')
        const now = new Date().toISOString()
        ids.forEach(id => {
          const lead = leadsRef.current.find(l => l.id === id)
          if (lead) trash.push({ ...lead, deleted_at: now })
        })
        localStorage.setItem('crm_trash', JSON.stringify(trash))
        const { error: delError } = await supabase.from('leads').delete().in('id', ids)
        if (delError) throw delError
      } else { throw error }
    }
    setLeads(prev => prev.filter(l => !ids.includes(l.id)))
  }, [])

  const restoreLead = useCallback(async (leadId: string) => {
    const { error } = await supabase.from('leads').update({ deleted_at: null }).eq('id', leadId)
    if (error) {
      const trash = JSON.parse(localStorage.getItem('crm_trash') || '[]')
      const restored = trash.find((l: any) => l.id === leadId)
      if (restored) {
        const { deleted_at, ...leadData } = restored
        const { error: insertErr } = await supabase.from('leads').insert(leadData)
        if (insertErr) throw insertErr
        localStorage.setItem('crm_trash', JSON.stringify(trash.filter((l: any) => l.id !== leadId)))
      } else { throw error }
    }
  }, [])

  const fetchDeleted = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
      if (error) throw error
      const dbLeads = (data || []).map(mapFromSupabase)
      const localTrash = JSON.parse(localStorage.getItem('crm_trash') || '[]').map(mapFromSupabase)
      const dbIds = new Set(dbLeads.map(l => l.id))
      return [...dbLeads, ...localTrash.filter((l: Lead) => !dbIds.has(l.id))]
    } catch {
      return JSON.parse(localStorage.getItem('crm_trash') || '[]').map(mapFromSupabase)
    }
  }, [])

  const hardDeleteLead = useCallback(async (leadId: string) => {
    const trash = JSON.parse(localStorage.getItem('crm_trash') || '[]')
    localStorage.setItem('crm_trash', JSON.stringify(trash.filter((l: any) => l.id !== leadId)))
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) throw error
  }, [])

  // ── Base Leads (saved) operations ──

  const [baseLeads, setBaseLeads] = useState<LeadInBase[]>([])
  const [baseLoading, setBaseLoading] = useState(false)
  const baseLeadsRef = useRef<LeadInBase[]>([])

  const fetchBaseLeads = useCallback(async (userId: string) => {
    setBaseLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .not('saved_at', 'is', null)
        .order('saved_at', { ascending: false })

      if (error) throw error

      const trashedIds = loadTrashedIds()
      const mapped = (data || []).map(row => mapToLeadInBase(row, trashedIds))
      setBaseLeads(mapped)
      baseLeadsRef.current = mapped
    } catch (err) {
      console.warn('Erro ao carregar base do Supabase:', err)
    } finally {
      setBaseLoading(false)
    }
  }, [])

  const addLeadToBase = useCallback(async (lead: Lead, userId: string | null) => {
    if (baseLeadsRef.current.some(l => l.id === lead.id)) return false

    const now = new Date().toISOString()
    const leadInBase: LeadInBase = { ...lead, addedToBaseAt: now }
    setBaseLeads(prev => [...prev, leadInBase])
    baseLeadsRef.current = [...baseLeadsRef.current, leadInBase]

    if (userId) {
      try {
        // Try updating existing lead first
        const { error: updateErr } = await supabase
          .from('leads')
          .update({ saved_at: now, user_id: userId, enriched_data: lead.enriched_data || null })
          .eq('id', lead.id)

        if (updateErr) {
          // If lead doesn't exist in leads table, insert it
          await supabase.from('leads').insert({
            id: lead.id,
            nome: lead.name,
            telefone: lead.phone,
            cidade: lead.city,
            plano: lead.plan,
            email: lead.email,
            idade: lead.age,
            score: lead.score,
            status: lead.status,
            fonte: lead.source,
            website: lead.website,
            cnpj: lead.cnpj,
            responsavel: lead.responsavel,
            created_at: lead.created_at || now,
            saved_at: now,
            user_id: userId,
            enriched_data: lead.enriched_data || null,
          })
        }
      } catch (err) {
        console.warn('Erro ao salvar no Supabase (mantido local):', err)
      }
    }
    return true
  }, [])

  const trashLead = useCallback(async (leadId: string, userId?: string | null) => {
    const now = new Date().toISOString()
    setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, deletedAt: now } : l))

    const trashedIds = loadTrashedIds()
    trashedIds[leadId] = now
    saveTrashedIds(trashedIds)

    if (userId) {
      try {
        await supabase.from('leads').update({ deleted_at: now }).eq('id', leadId).eq('user_id', userId)
      } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
    }
    return true
  }, [])

  const restoreBaseLead = useCallback(async (leadId: string, userId?: string | null) => {
    setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, deletedAt: null } : l))

    const trashedIds = loadTrashedIds()
    delete trashedIds[leadId]
    saveTrashedIds(trashedIds)

    if (userId) {
      try { await supabase.from('leads').update({ deleted_at: null }).eq('id', leadId).eq('user_id', userId) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
    }
    return true
  }, [])

  const permanentDelete = useCallback(async (leadId: string, userId?: string | null) => {
    setBaseLeads(prev => prev.filter(l => l.id !== leadId))
    baseLeadsRef.current = baseLeadsRef.current.filter(l => l.id !== leadId)

    const trashedIds = loadTrashedIds()
    delete trashedIds[leadId]
    saveTrashedIds(trashedIds)

    if (userId) {
      try { await supabase.from('leads').delete().eq('id', leadId).eq('user_id', userId) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
    }

    // Clean localStorage enriched data
    try {
      const enriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
      for (const [key, val] of Object.entries(enriched)) {
        if ((val as any)?.leadId === leadId) delete enriched[key]
      }
      localStorage.setItem('mabrumi_enriched_leads', JSON.stringify(enriched))
    } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }

    return true
  }, [])

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: Lead['status'], userId?: string | null) => {
    setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))

    if (userId) {
      try { await supabase.from('leads').update({ status: newStatus }).eq('id', leadId).eq('user_id', userId) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
    }
  }, [])

  const reprocessLead = useCallback(async (leadId: string): Promise<{ ok: boolean; found: string[]; errors: string[] }> => {
    const lead = baseLeadsRef.current.find(l => l.id === leadId)
    if (!lead) return { ok: false, found: [], errors: ['Lead não encontrado'] }

    const found: string[] = []
    const errors: string[] = []

    try {
      // Step 1: CNPJ / Responsável lookup
      const enrichRes = await fetch(`${API_BASE}/api/enrich`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: '', name: lead.name || '', city: lead.city || '', phone: lead.phone || '' }),
      })
      let enrichData: any = {}
      if (enrichRes.ok) {
        enrichData = await enrichRes.json()
        if (enrichData.cnpj) found.push(`CNPJ: ${enrichData.cnpj}`)
        if (enrichData.responsavel) found.push(`Responsável: ${enrichData.responsavel}`)
        if (enrichData.razao_social) found.push(`Razão Social: ${enrichData.razao_social}`)
      } else { errors.push('Erro na busca de CNPJ') }

      // Step 2: Social media
      const socialRes = await fetch(`${API_BASE}/api/social-search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: enrichData.responsavel || '', company: lead.name || '', city: lead.city || '', business_name: enrichData.nome_fantasia || lead.name || '', website: '' }),
      })
      let socialData: any = {}
      if (socialRes.ok) {
        socialData = await socialRes.json()
        const platforms = Object.keys(socialData).filter(p => socialData[p]?.url)
        if (platforms.length > 0) found.push(`Redes sociais: ${platforms.join(', ')}`)
      }

      // Step 3: Health plan
      const hpRes = await fetch(`${API_BASE}/api/health-plan-check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: enrichData.cnpj || '', name: enrichData.razao_social || lead.name || '', porte: enrichData.porte || '', qtd_funcionarios: '', capital_social: String(enrichData.capital_social || ''), cnae: String(enrichData.cnae_fiscal || '') }),
      })
      let hpData: any = {}
      if (hpRes.ok) { hpData = await hpRes.json(); if (hpData.tem_plano === true) found.push(`Plano de saúde: ${hpData.tipo || 'Sim'}`) }

      // Step 4: Employee count
      const ecRes = await fetch(`${API_BASE}/api/employee-count`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lead.name || '', cnpj: enrichData.cnpj || '', porte: enrichData.porte || '', capital_social: String(enrichData.capital_social || ''), cnae: String(enrichData.cnae_fiscal || '') }),
      })
      let ecData: any = {}
      if (ecRes.ok) { ecData = await ecRes.json(); if (ecData.funcionarios) found.push(`Colaboradores: ${ecData.funcionarios}`) }

      // Build enriched payload
      const enrichedPayload = {
        CNPJ: enrichData.cnpj || '', RazaoSocial: enrichData.razao_social || '', NomeFantasia: enrichData.nome_fantasia || '',
        Responsavel: enrichData.responsavel || '', Socios: enrichData.socios || '', Porte: enrichData.porte || '',
        AtividadePrincipal: enrichData.atividade_principal || '', CNAEFiscal: enrichData.cnae_fiscal || '',
        CnaesSecundarios: enrichData.cnaes_secundarios || [], NaturezaJuridica: enrichData.natureza_juridica || '',
        CapitalSocial: enrichData.capital_social || '', SituacaoCadastral: enrichData.situacao_cadastral || '',
        CEP: enrichData.cep || '', UF: enrichData.uf || '', Municipio: enrichData.municipio || '',
        Bairro: enrichData.bairro || '', EnderecoCompleto: enrichData.endereco_completo || '',
        Telefone1: enrichData.telefone_1 || '', Telefone2: enrichData.telefone_2 || '',
        Email: enrichData.email || '', QSA: enrichData.qsa || [],
        OpcaoSimples: enrichData.opcao_simples, OpcaoMEI: enrichData.opcao_mei,
        RegimeTributario: enrichData.regime_tributario || [], DataInicioAtividade: enrichData.data_inicio_atividade || '',
        IdentificadorMatrizFilial: enrichData.identificador_matriz_filial || '',
        SocialMedia: socialData, HealthPlan: hpData, EmployeeCount: ecData,
      }

      // Save to Supabase
      try { await supabase.from('leads').update({ enriched_data: enrichedPayload }).eq('id', leadId) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }

      // Save to localStorage backup
      const phoneKey = (lead.phone || '').replace(/\D/g, '')
      if (phoneKey) {
        const enriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
        enriched[phoneKey] = { ...enrichedPayload, leadId }
        localStorage.setItem('mabrumi_enriched_leads', JSON.stringify(enriched))
      }

      // Update local state
      setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, enriched_data: enrichedPayload } : l))
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, enriched_data: enrichedPayload } : l))

      return { ok: found.length > 0, found, errors }
    } catch (err: any) {
      errors.push(err.message || 'Erro desconhecido')
      return { ok: false, found, errors }
    }
  }, [])

  const batchReprocessLead = useCallback(async (leadIds: string[]): Promise<void> => {
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i]
      const lead = baseLeadsRef.current.find(l => l.id === leadId)
      if (!lead) continue
      try { await reprocessLead(leadId) } catch (e) { console.warn('[useLeads] Supabase operation failed:', e) }
      if (i < leadIds.length - 1) await new Promise(r => setTimeout(r, 500))
    }
  }, [reprocessLead])

  // ── Computed ──
  const activeBaseLeads = baseLeads.filter(l => !l.deletedAt)
  const trashedLeads = baseLeads.filter(l => l.deletedAt)

  return {
    // Regular leads (all)
    leads,
    loading,
    error,
    refetch: fetchLeads,
    deleteLead,
    deleteMultipleLeads,
    restoreLead,
    fetchDeleted,
    hardDeleteLead,

    // Base leads (saved)
    baseLeads: activeBaseLeads,
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

    // Utils
    filters,
    setFilters,
  }
}
