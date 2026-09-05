import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import { Lead } from '@/types/lead'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? window.location.origin : 'http://localhost:8002')

// Local storage keys for trash persistence
const TRASH_KEY = 'mabrumi_trashed_leads'

export interface LeadInBase extends Lead {
  addedToBaseAt: string
  deletedAt?: string | null
  enriched_data?: any
}

// Load trashed lead IDs from localStorage
function loadTrashedIds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TRASH_KEY) || '{}')
  } catch { return {} }
}

// Save trashed lead IDs to localStorage
function saveTrashedIds(ids: Record<string, string>) {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(ids))
  } catch {}
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

      // Load trashed IDs from localStorage
      const trashedIds = loadTrashedIds()

      if (data && data.length > 0) {
        const mapped: LeadInBase[] = data.map((row: any) => {
          const leadId = row.lead_id || row.id
          return {
            id: leadId,
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
            // Use localStorage for trash state (works even without deleted_at column)
            deletedAt: trashedIds[leadId] || row.deleted_at || null,
          }
        })
        setBaseLeads(mapped)
      } else {
        setBaseLeads([])
      }
    } catch (err) {
      console.warn('Erro ao carregar base do Supabase:', err)
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

  // Soft delete — move to trash (100% local, no Supabase dependency)
  const trashLead = useCallback(async (leadId: string) => {
    const now = new Date().toISOString()

    // Update local state immediately
    setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, deletedAt: now } : l))

    // Persist to localStorage (works regardless of Supabase schema)
    const trashedIds = loadTrashedIds()
    trashedIds[leadId] = now
    saveTrashedIds(trashedIds)

    // Also try Supabase (best effort, won't break if column doesn't exist)
    if (userId) {
      try {
        const { error } = await supabase
          .from('base_leads')
          .update({ deleted_at: now })
          .eq('lead_id', leadId)
          .eq('user_id', userId)
        if (error) {
          console.warn('Supabase deleted_at não disponível, usando localStorage:', error.message)
        }
      } catch (err) {
        // Silent — localStorage already saved
      }
    }

    return true
  }, [userId])

  // Restore from trash
  const restoreLead = useCallback(async (leadId: string) => {
    // Update local state
    setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, deletedAt: null } : l))

    // Remove from localStorage trash
    const trashedIds = loadTrashedIds()
    delete trashedIds[leadId]
    saveTrashedIds(trashedIds)

    // Also try Supabase (best effort)
    if (userId) {
      try {
        await supabase
          .from('base_leads')
          .update({ deleted_at: null })
          .eq('lead_id', leadId)
          .eq('user_id', userId)
      } catch {}
    }

    return true
  }, [userId])

  // Permanent delete
  const permanentDelete = useCallback(async (leadId: string) => {
    // Remove from local state
    setBaseLeads(prev => prev.filter(l => l.id !== leadId))

    // Remove from localStorage trash
    const trashedIds = loadTrashedIds()
    delete trashedIds[leadId]
    saveTrashedIds(trashedIds)

    // Delete from Supabase
    if (userId) {
      try {
        await supabase
          .from('base_leads')
          .delete()
          .eq('lead_id', leadId)
          .eq('user_id', userId)
      } catch (err) {
        console.warn('Erro ao excluir do Supabase:', err)
      }
    }

    // Also remove enriched data from localStorage
    try {
      const enriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
      for (const [key, val] of Object.entries(enriched)) {
        if ((val as any)?.leadId === leadId) {
          delete enriched[key]
        }
      }
      localStorage.setItem('mabrumi_enriched_leads', JSON.stringify(enriched))
    } catch {}

    return true
  }, [userId])

  // Legacy hard delete (redirects to trash)
  const removeLeadFromBase = useCallback(async (leadId: string) => {
    return trashLead(leadId)
  }, [trashLead])

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

  // Re-process lead: run full enrichment pipeline (same as Google Maps Scraper)
  // Returns an object with status and details about what was found
  const reprocessLead = useCallback(async (leadId: string): Promise<{ ok: boolean; found: string[]; errors: string[] }> => {
    const lead = baseLeads.find(l => l.id === leadId)
    if (!lead) return { ok: false, found: [], errors: ['Lead não encontrado'] }

    const found: string[] = []
    const errors: string[] = []

    try {
      // Step 1: CNPJ / Responsável lookup
      console.log('[REPROCESS] Step 1: Enriching', lead.name, 'city:', lead.city, 'phone:', lead.phone)
      const enrichRes = await fetch(`${API_BASE}/api/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '',
          name: lead.name || '',
          city: lead.city || '',
          phone: lead.phone || '',
        }),
      })
      let enrichData: any = {}
      if (enrichRes.ok) {
        enrichData = await enrichRes.json()
        console.log('[REPROCESS] Enrich result:', enrichData)
        if (enrichData.cnpj) found.push(`CNPJ: ${enrichData.cnpj}`)
        if (enrichData.responsavel) found.push(`Responsável: ${enrichData.responsavel}`)
        if (enrichData.razao_social) found.push(`Razão Social: ${enrichData.razao_social}`)
      } else {
        const errText = await enrichRes.text()
        console.error('[REPROCESS] Enrich error:', errText)
        errors.push('Erro na busca de CNPJ')
      }

      // Step 2: Social media search
      console.log('[REPROCESS] Step 2: Social media for', lead.name)
      const socialRes = await fetch(`${API_BASE}/api/social-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enrichData.responsavel || '',
          company: lead.name || '',
          city: lead.city || '',
          business_name: enrichData.nome_fantasia || lead.name || '',
          website: '',
        }),
      })
      let socialData: any = {}
      if (socialRes.ok) {
        socialData = await socialRes.json()
        const socialPlatforms = Object.keys(socialData).filter(p => socialData[p]?.url)
        if (socialPlatforms.length > 0) found.push(`Redes sociais: ${socialPlatforms.join(', ')}`)
      }

      // Step 3: Health plan check
      console.log('[REPROCESS] Step 3: Health plan check')
      const hpRes = await fetch(`${API_BASE}/api/health-plan-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: enrichData.cnpj || '',
          name: enrichData.razao_social || lead.name || '',
          porte: enrichData.porte || '',
          qtd_funcionarios: '',
          capital_social: String(enrichData.capital_social || ''),
          cnae: String(enrichData.cnae_fiscal || ''),
        }),
      })
      let hpData: any = {}
      if (hpRes.ok) {
        hpData = await hpRes.json()
        if (hpData.tem_plano === true) found.push(`Plano de saúde: ${hpData.tipo || 'Sim'}`)
      }

      // Step 4: Employee count
      console.log('[REPROCESS] Step 4: Employee count')
      const ecRes = await fetch(`${API_BASE}/api/employee-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name || '',
          cnpj: enrichData.cnpj || '',
          porte: enrichData.porte || '',
          capital_social: String(enrichData.capital_social || ''),
          cnae: String(enrichData.cnae_fiscal || ''),
        }),
      })
      let ecData: any = {}
      if (ecRes.ok) {
        ecData = await ecRes.json()
        if (ecData.funcionarios) found.push(`Colaboradores: ${ecData.funcionarios}`)
        if (ecData.faixa) found.push(`Faixa: ${ecData.faixa}`)
      }

      // Save enriched data to localStorage (keyed by phone, same as scraper)
      const phoneKey = (lead.phone || '').replace(/\D/g, '')
      console.log('[REPROCESS] Saving to localStorage with phoneKey:', phoneKey)
      if (phoneKey) {
        const enriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
        enriched[phoneKey] = {
          Responsavel: enrichData.responsavel || '',
          Socios: enrichData.socios || '',
          CNPJ: enrichData.cnpj || '',
          RazaoSocial: enrichData.razao_social || '',
          NomeFantasia: enrichData.nome_fantasia || '',
          SituacaoCadastral: enrichData.situacao_cadastral || '',
          NaturezaJuridica: enrichData.natureza_juridica || '',
          Porte: enrichData.porte || '',
          CapitalSocial: enrichData.capital_social || '',
          AtividadePrincipal: enrichData.atividade_principal || '',
          CNAEFiscal: enrichData.cnae_fiscal || '',
          CnaesSecundarios: enrichData.cnaes_secundarios || [],
          RegimeTributario: enrichData.regime_tributario || [],
          DataInicioAtividade: enrichData.data_inicio_atividade || '',
          IdentificadorMatrizFilial: enrichData.identificador_matriz_filial || '',
          CEP: enrichData.cep || '',
          UF: enrichData.uf || '',
          Municipio: enrichData.municipio || '',
          Bairro: enrichData.bairro || '',
          EnderecoCompleto: enrichData.endereco_completo || '',
          Telefone1: enrichData.telefone_1 || '',
          Telefone2: enrichData.telefone_2 || '',
          Email: enrichData.email || '',
          QSA: enrichData.qsa || [],
          OpcaoSimples: enrichData.opcao_simples,
          OpcaoMEI: enrichData.opcao_mei,
          SocialMedia: socialData,
          HealthPlan: hpData,
          EmployeeCount: ecData,
          leadId: leadId,
        }
        localStorage.setItem('mabrumi_enriched_leads', JSON.stringify(enriched))
        console.log('[REPROCESS] Saved to localStorage. Keys:', Object.keys(enriched[phoneKey]).filter(k => enriched[phoneKey][k]))
      }

      // Update lead in React state so UI re-renders immediately
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
      setBaseLeads(prev => prev.map(l => l.id === leadId ? { ...l, enriched_data: enrichedPayload } : l))

      return { ok: found.length > 0, found, errors }
    } catch (err: any) {
      console.error('[REPROCESS] Fatal error:', err)
      errors.push(err.message || 'Erro desconhecido')
      return { ok: false, found, errors }
    }
  }, [baseLeads])

  // Batch reprocess: process leads one by one sequentially
  const batchReprocessLead = useCallback(async (leadIds: string[]): Promise<void> => {
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i]
      const lead = baseLeads.find(l => l.id === leadId)
      if (!lead) continue
      console.log(`[BATCH-REPROCESS] ${i + 1}/${leadIds.length}: ${lead.name}`)
      try {
        await reprocessLead(leadId)
      } catch (err) {
        console.error(`[BATCH-REPROCESS] Erro em ${lead.name}:`, err)
      }
      // Small delay between requests to avoid rate limiting
      if (i < leadIds.length - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }, [baseLeads, reprocessLead])

  // Computed: active leads (not deleted)
  const activeLeads = baseLeads.filter(l => !l.deletedAt)
  const trashedLeads = baseLeads.filter(l => l.deletedAt)

  return {
    baseLeads: activeLeads,
    trashedLeads,
    loading,
    addLeadToBase,
    removeLeadFromBase,
    trashLead,
    restoreLead,
    permanentDelete,
    updateLeadStatus,
    reprocessLead,
    batchReprocessLead,
    refetch: fetchBaseLeads
  }
}
