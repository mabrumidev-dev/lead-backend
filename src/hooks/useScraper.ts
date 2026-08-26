import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? window.location.origin : 'http://localhost:8002')

export interface QSAItem {
  nome: string
  qualificacao: string
  entrada: string
  faixa_etaria: string
  representante_legal: string
  rep_qualificacao: string
}

export interface SocialProfile {
  url: string
  title?: string
  not_found?: boolean
  other_matches?: string[]
  snippet?: string
  source?: 'pessoa' | 'negocio'
}

export interface SocialMediaData {
  [platform: string]: SocialProfile
}

export interface ScrapedLead {
  Name: string
  Phone: string | null
  Address: string | null
  Website: string | null
  'Total Reviews': string | null
  Rating: string | null
  Responsavel?: string
  Socios?: string
  CNPJ?: string
  RazaoSocial?: string
  NomeFantasia?: string
  SituacaoCadastral?: string
  MotivoSituacao?: string
  DataSituacaoCadastral?: string
  NaturezaJuridica?: string
  Porte?: string
  CapitalSocial?: number | string
  AtividadePrincipal?: string
  CNAEFiscal?: number | string
  CnaesSecundarios?: string[]
  OpcaoSimples?: boolean | null
  OpcaoMEI?: boolean | null
  RegimeTributario?: string[]
  SituacaoEspecial?: string
  DataInicioAtividade?: string
  DataOpcaoSimples?: string
  IdentificadorMatrizFilial?: string
  CEP?: string
  UF?: string
  Municipio?: string
  Bairro?: string
  EnderecoCompleto?: string
  Telefone1?: string
  Telefone2?: string
  Fax?: string
  Email?: string
  QSA?: QSAItem[]
  EntidadeFederativa?: string
  CodigoMunicipioIBGE?: number | string
  SocialMedia?: SocialMediaData
  HealthPlan?: {
    tem_plano: boolean | null
    tipo: string
    confianca: string
    sinais: string[]
    detalhes: Record<string, string>
  }
  EmployeeCount?: {
    funcionarios: number | null
    fonte: string
    confianca: string
    faixa: string
    detalhes?: Record<string, string>
  }
}

interface ScrapeJob {
  jobId: string
  status: 'starting' | 'running' | 'done' | 'error' | 'cancelled'
  progress: number
  messages: string[]
  results: ScrapedLead[]
  screenshots: string[]
}

export function useScraper() {
  const [job, setJob] = useState<ScrapeJob | null>(null)
  const [isScraping, setIsScraping] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const startScrape = useCallback(async (query: string, limit: number = 0) => {
    if (!query.trim()) return

    console.log('[SCRAPER] API_BASE:', API_BASE)
    console.log('[SCRAPER] Query:', query.trim())

    setIsScraping(true)
    setJob({ jobId: '', status: 'starting', progress: 0, messages: ['Iniciando...'], results: [], screenshots: [] })

    try {
      console.log('[SCRAPER] Fetching POST', `${API_BASE}/api/scrape`)
      const res = await fetch(`${API_BASE}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit }),
      })

      console.log('[SCRAPER] Response status:', res.status)
      if (!res.ok) throw new Error('Erro ao conectar com o servidor do scraper')

      const { job_id } = await res.json()
      console.log('[SCRAPER] Job ID:', job_id)
      setJob(prev => prev ? { ...prev, jobId: job_id, status: 'running' } : null)

      const es = new EventSource(`${API_BASE}/api/scrape/${job_id}/stream`)
      eventSourceRef.current = es

      es.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data)
        setJob(prev => prev ? {
          ...prev,
          progress: data.progress,
          messages: [...prev.messages, data.message],
          status: 'running',
        } : null)
      })

      es.addEventListener('screenshot', (e) => {
        const data = JSON.parse(e.data)
        setJob(prev => prev ? {
          ...prev,
          screenshots: [...prev.screenshots, data.image],
        } : null)
      })

      es.addEventListener('done', (e) => {
        const data = JSON.parse(e.data)
        setJob(prev => prev ? {
          ...prev,
          status: 'done',
          progress: 100,
          results: data.results,
          messages: [...prev.messages, `${data.total} registros coletados!`],
        } : null)
        setIsScraping(false)
        es.close()
      })

      es.addEventListener('error', (e) => {
        const data = JSON.parse((e as MessageEvent).data || '{}')
        setJob(prev => prev ? {
          ...prev,
          status: 'error',
          messages: [...prev.messages, data.message || 'Erro de conexao'],
        } : null)
        setIsScraping(false)
        es.close()
      })

      es.onerror = () => {
        setJob(prev => prev ? {
          ...prev,
          status: 'error',
          messages: [...prev.messages, 'Conexao perdida com o servidor'],
        } : null)
        setIsScraping(false)
        es.close()
      }
    } catch (err: any) {
      console.error('[SCRAPER] Error:', err.message)
      setJob(prev => prev ? {
        ...prev,
        status: 'error',
        messages: [...(prev?.messages || []), err.message || 'Erro ao iniciar scraping'],
      } : null)
      setIsScraping(false)
    }
  }, [])

  const enrichLead = useCallback(async (website: string, name?: string, city?: string, phone?: string): Promise<Partial<ScrapedLead>> => {
    try {
      const res = await fetch(`${API_BASE}/api/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, name: name || '', city: city || '', phone: phone || '' }),
      })
      if (!res.ok) return {}
      const d = await res.json()
      return {
        Responsavel: d.responsavel || '',
        Socios: d.socios || '',
        CNPJ: d.cnpj || '',
        RazaoSocial: d.razao_social || '',
        NomeFantasia: d.nome_fantasia || '',
        SituacaoCadastral: d.situacao_cadastral || '',
        MotivoSituacao: d.motivo_situacao || '',
        DataSituacaoCadastral: d.data_situacao_cadastral || '',
        NaturezaJuridica: d.natureza_juridica || '',
        Porte: d.porte || '',
        CapitalSocial: d.capital_social ?? '',
        AtividadePrincipal: d.atividade_principal || '',
        CNAEFiscal: d.cnae_fiscal ?? '',
        CnaesSecundarios: d.cnaes_secundarios || [],
        OpcaoSimples: d.opcao_simples,
        OpcaoMEI: d.opcao_mei,
        RegimeTributario: d.regime_tributario || [],
        SituacaoEspecial: d.situacao_especial || '',
        DataInicioAtividade: d.data_inicio_atividade || '',
        DataOpcaoSimples: d.data_opcao_simples || '',
        IdentificadorMatrizFilial: d.identificador_matriz_filial || '',
        CEP: d.cep || '',
        UF: d.uf || '',
        Municipio: d.municipio || '',
        Bairro: d.bairro || '',
        EnderecoCompleto: d.endereco_completo || '',
        Telefone1: d.telefone_1 || '',
        Telefone2: d.telefone_2 || '',
        Fax: d.fax || '',
        Email: d.email || '',
        QSA: d.qsa || [],
        EntidadeFederativa: d.entidade_federativa || '',
        CodigoMunicipioIBGE: d.codigo_municipio_ibge ?? '',
      }
    } catch {
      return {}
    }
  }, [])

  const cancelScrape = useCallback(() => {
    if (job?.jobId) {
      fetch(`${API_BASE}/api/scrape/${job.jobId}`, { method: 'DELETE' }).catch(() => {})
    }
    eventSourceRef.current?.close()
    setJob(prev => prev ? { ...prev, status: 'cancelled' } : null)
    setIsScraping(false)
  }, [job?.jobId])

  const searchSocialMedia = useCallback(async (name: string, company?: string, city?: string, businessName?: string, website?: string): Promise<SocialMediaData> => {
    try {
      const res = await fetch(`${API_BASE}/api/social-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company: company || '', city: city || '', business_name: businessName || '', website: website || '' }),
      })
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  }, [])

  const reset = useCallback(() => {
    eventSourceRef.current?.close()
    setJob(null)
    setIsScraping(false)
  }, [])

  const checkHealthPlan = useCallback(async (cnpj?: string, name?: string, porte?: string, qtdFuncionarios?: string, capitalSocial?: string, cnae?: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/api/health-plan-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cnpj || '', name: name || '', porte: porte || '', qtd_funcionarios: qtdFuncionarios || '', capital_social: capitalSocial || '', cnae: cnae || '' }),
      })
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  }, [])

  const checkEmployeeCount = useCallback(async (name?: string, cnpj?: string, porte?: string, capitalSocial?: string, cnae?: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/api/employee-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || '', cnpj: cnpj || '', porte: porte || '', capital_social: capitalSocial || '', cnae: cnae || '' }),
      })
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  }, [])

  return { job, isScraping, startScrape, cancelScrape, reset, enrichLead, searchSocialMedia, checkHealthPlan, checkEmployeeCount }
}
