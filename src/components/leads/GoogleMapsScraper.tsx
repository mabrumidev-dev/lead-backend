import { useState, useEffect, useRef } from 'react'
import { Search, Play, XCircle, Loader2, MapPin, Phone, Globe, Star, Download, RotateCcw, Eye, FileDown, User, Building2, ChevronDown, ArrowDownUp, Share2 } from 'lucide-react'
import { useScraper, ScrapedLead } from '@/hooks/useScraper'
import LeadDetailPopup from '@/components/leads/LeadDetailPopup'
import { supabase } from '@/hooks/useLeads'
import { Lead } from '@/types/lead'

interface Props {
  onImportComplete: (leads: Lead[]) => void
}

const STORAGE_KEY = 'mabrumi_scraper_results'

const ESTADOS = [
  { sigla: '', nome: 'Todos' },
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapa' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceara' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espirito Santo' },
  { sigla: 'GO', nome: 'Goias' }, { sigla: 'MA', nome: 'Maranhao' }, { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' }, { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Para' }, { sigla: 'PB', nome: 'Paraiba' }, { sigla: 'PR', nome: 'Parana' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piaui' }, { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondonia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'Sao Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
]

const NICHOS = [
  '', 'Restaurante', 'Clinica', 'Escritorio de Advocacia', 'Academia', 'Farmacia',
  'Odontologia', 'Psicologia', 'Contabilidade', 'Imobiliaria', 'Autopeca',
  'Pet Shop', 'Salao de Beleza', 'Construtora', 'Escola', 'Hotel',
  'Seguros', 'Corretora de Seguros', 'Consultoria', 'TI / Software', 'Marketing',
]

const CIDADES_PRINCIPAIS = [
  '', 'Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasilia', 'Curitiba',
  'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Manaus', 'Florianopolis',
  'Goiania', 'Campinas', 'Vitoria', 'Natal', 'Joao Pessoa', 'Maceio', 'Aracaju',
]

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

const SKIP_WORDS = ['Brazil', 'Brasil', 'BR']

function extractCity(address: string | null): string {
  if (!address) return 'Sao Paulo'
  const parts = address.split(',').map(p => p.trim())
  for (let i = parts.length - 1; i >= 0; i--) {
    let part = parts[i]
    part = part.replace(/\d{5}-?\d{3}/g, '').trim()
    if (!part) continue
    const sub = part.split('-').map(s => s.trim()).filter(s => {
      if (!s) return false
      if (/^\d+$/.test(s)) return false
      if (/^[A-Z]{2}$/i.test(s)) return false
      if (SKIP_WORDS.some(w => w.toLowerCase() === s.toLowerCase())) return false
      return true
    })
    if (sub.length > 0) return sub[sub.length - 1]
  }
  return 'Sao Paulo'
}

function extractState(address: string | null): string {
  if (!address) return ''
  const match = address.match(/\b([A-Z]{2})\b/)
  return match ? match[1] : ''
}

function calculateScore(rating: string | null, reviews: string | null): number {
  let score = 50
  if (rating) {
    const r = parseFloat(rating.replace(',', '.'))
    if (!isNaN(r)) score = Math.round(r * 20)
  }
  if (reviews) {
    const revNum = parseInt(reviews.replace(/\D/g, ''))
    if (!isNaN(revNum) && revNum > 100) score = Math.min(100, score + 10)
  }
  return score
}

function downloadCSV(results: ScrapedLead[]) {
  const headers = ['Name', 'Phone', 'Address', 'Website', 'Total Reviews', 'Rating', 'Responsavel', 'Socios', 'CNPJ']
  const rows = results.map(r => [
    `"${(r.Name || '').replace(/"/g, '""')}"`,
    `"${(r.Phone || '').replace(/"/g, '""')}"`,
    `"${(r.Address || '').replace(/"/g, '""')}"`,
    `"${(r.Website || '').replace(/"/g, '""')}"`,
    `"${(r['Total Reviews'] || '').replace(/"/g, '""')}"`,
    `"${(r.Rating || '').replace(/"/g, '""')}"`,
    `"${(r.Responsavel || '').replace(/"/g, '""')}"`,
    `"${(r.Socios || '').replace(/"/g, '""')}"`,
    `"${(r.CNPJ || '').replace(/"/g, '""')}"`,
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function loadSavedResults(): ScrapedLead[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveResults(results: ScrapedLead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  } catch {}
}

export function GoogleMapsScraper({ onImportComplete }: Props) {
  const { job, isScraping, startScrape, cancelScrape, reset, enrichLead, searchSocialMedia, checkHealthPlan, checkEmployeeCount } = useScraper()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState<number>(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const [savedResults, setSavedResults] = useState<ScrapedLead[]>(() => loadSavedResults() || [])
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<ScrapedLead | null>(null)
  const [enrichedNames, setEnrichedNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (job?.status === 'done') {
      if (job.results.length > 0) {
        setSavedResults(job.results)
        saveResults(job.results)
      } else {
        setSavedResults([])
        saveResults([])
      }
    }
  }, [job?.status, job?.results])

  useEffect(() => {
    if (previewRef.current && job?.screenshots && job.screenshots.length > 0) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [job?.screenshots?.length])

  const latestScreenshot = job?.screenshots && job.screenshots.length > 0
    ? job.screenshots[job.screenshots.length - 1]
    : null

  const displayResults = savedResults.length > 0 ? savedResults : (job?.status === 'done' ? job.results : [])
  const showResults = displayResults && displayResults.length > 0

  const handleScrape = () => {
    if (!query.trim()) return
    setSelected(new Set())
    startScrape(query, limit)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScraping) handleScrape()
  }

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (!displayResults) return
    if (selected.size === displayResults.length) setSelected(new Set())
    else setSelected(new Set(displayResults.map((_, i) => i)))
  }

  const handleEnrich = async () => {
    if (!displayResults || selected.size === 0) return
    setEnriching(true)
    const updated = [...displayResults]
    const selectedArr = Array.from(selected)
    let enriched = 0
    let socialFound = 0
    const newEnriched = new Set(enrichedNames)

    for (let i = 0; i < selectedArr.length; i++) {
      const idx = selectedArr[i]
      const lead = updated[idx]

      // Step 1: CNPJ/Responsavel lookup (if not already)
      if (!lead.Responsavel) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Buscando dados de ${lead.Name}...`)
        try {
          console.log('[ENRICH-UI] Enriching lead:', lead.Name, 'website:', lead.Website, 'phone:', lead.Phone)
          const data = await enrichLead(lead.Website || '', lead.Name, extractCity(lead.Address), lead.Phone || '')
          console.log('[ENRICH-UI] Result for', lead.Name, ':', data)
          updated[idx] = { ...lead, ...data }
          newEnriched.add(lead.Name)
          if (data.Responsavel || data.CNPJ) enriched++
        } catch (err) {
          console.error('[ENRICH-UI] Error enriching', lead.Name, err)
          newEnriched.add(lead.Name)
        }
      }

      // Step 2: Social media search (always, using whatever name/business is available)
      const current = updated[idx]
      const personName = current.Responsavel || ''
      const bizName = current.NomeFantasia || current.Name || ''
      if (personName || bizName) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Redes sociais de ${personName || bizName}...`)
        try {
          const social = await searchSocialMedia(personName, current.Name, extractCity(current.Address), bizName, current.Website || '')
          updated[idx] = { ...current, SocialMedia: social }
          const platforms = Object.keys(social).filter(p => social[p]?.url)
          if (platforms.length > 0) socialFound++
        } catch {}
      }

      // Step 3: Health plan check
      const lead2 = updated[idx]
      if (lead2.CNPJ || lead2.Name) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Verificando plano de saude...`)
        try {
          const hp = await checkHealthPlan(lead2.CNPJ || '', lead2.Name || '', lead2.Porte || '', String(lead2.QSA?.length || 0), String(lead2.CapitalSocial || ''), String(lead2.CNAEFiscal || ''))
          updated[idx] = { ...lead2, HealthPlan: hp }
        } catch {}
      }

      // Step 4: Employee count
      const lead3 = updated[idx]
      if (lead3.Name) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Buscando quadro de colaboradores...`)
        try {
          const ec = await checkEmployeeCount(lead3.Name || lead3.NomeFantasia || '', lead3.CNPJ || '', lead3.Porte || '', String(lead3.CapitalSocial || ''), String(lead3.CNAEFiscal || ''))
          updated[idx] = { ...lead3, EmployeeCount: ec }
        } catch {}
      }
    }

    setSavedResults(updated)
    saveResults(updated)
    setEnrichedNames(newEnriched)
    setEnriching(false)
    const parts = []
    if (enriched > 0) parts.push(`${enriched} responsavel(is)`)
    if (socialFound > 0) parts.push(`${socialFound} perfil(is) social(is)`)
    const hpFound = updated.filter(u => u.HealthPlan?.tem_plano === true).length
    if (hpFound > 0) parts.push(`${hpFound} plano(s) de saude`)
    const ecFound = updated.filter(u => u.EmployeeCount?.fonte).length
    if (ecFound > 0) parts.push(`${ecFound} colaborador(es)`) 
    setEnrichProgress(parts.length > 0 ? parts.join(' + ') : 'Nenhum dado novo encontrado.')
    setTimeout(() => setEnrichProgress(''), 5000)
  }

  const handleImport = async () => {
    if (!displayResults || selected.size === 0) return
    setImporting(true)

    try {
      const enrichedData: Record<string, any> = {}
      const leadsToImport = Array.from(selected).map(idx => {
        const r = displayResults[idx]
        const telefone = formatPhone(r.Phone)
        const phoneKey = telefone.replace(/\D/g, '')
        enrichedData[phoneKey] = {
          Responsavel: r.Responsavel || '',
          Socios: r.Socios || '',
          CNPJ: r.CNPJ || '',
          RazaoSocial: r.RazaoSocial || '',
          NomeFantasia: r.NomeFantasia || '',
          SituacaoCadastral: r.SituacaoCadastral || '',
          NaturezaJuridica: r.NaturezaJuridica || '',
          Porte: r.Porte || '',
          CapitalSocial: r.CapitalSocial || '',
          AtividadePrincipal: r.AtividadePrincipal || '',
          CNAEFiscal: r.CNAEFiscal || '',
          CnaesSecundarios: r.CnaesSecundarios || [],
          RegimeTributario: r.RegimeTributario || [],
          DataInicioAtividade: r.DataInicioAtividade || '',
          IdentificadorMatrizFilial: r.IdentificadorMatrizFilial || '',
          CEP: r.CEP || '',
          UF: r.UF || '',
          Municipio: r.Municipio || '',
          Bairro: r.Bairro || '',
          EnderecoCompleto: r.EnderecoCompleto || '',
          Telefone1: r.Telefone1 || '',
          Telefone2: r.Telefone2 || '',
          Email: r.Email || '',
          QSA: r.QSA || [],
          OpcaoSimples: r.OpcaoSimples,
          OpcaoMEI: r.OpcaoMEI,
          SocialMedia: r.SocialMedia || {},
          Address: r.Address || '',
          Website: r.Website || '',
          Rating: r.Rating || '',
          'Total Reviews': r['Total Reviews'] || '',
        }
        return {
          id: crypto.randomUUID(),
          name: r.Name || '',
          email: r.Email || '',
          phone: telefone,
          city: extractCity(r.Address),
          plan: 'Individual' as const,
          status: 'new' as const,
          score: calculateScore(r.Rating, r['Total Reviews']),
          source: 'Google Maps' as const,
          created_at: new Date().toISOString(),
        }
      })

      const { error } = await supabase.from('leads').insert(leadsToImport)
      if (error) throw error

      const existing = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
      localStorage.setItem('mabrumi_enriched_leads', JSON.stringify({ ...existing, ...enrichedData }))

      onImportComplete(leadsToImport)
      const remaining = displayResults.filter((_, i) => !selected.has(i))
      setSavedResults(remaining)
      if (remaining.length > 0) {
        saveResults(remaining)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        reset()
      }
      setQuery('')
      setSelected(new Set())
    } catch (err: any) {
      alert('Erro ao importar: ' + (err.message || 'Desconhecido'))
    } finally {
      setImporting(false)
    }
  }

  const handleClearSaved = () => {
    setSavedResults([])
    setSelected(new Set())
    localStorage.removeItem(STORAGE_KEY)
    reset()
  }

  const handleDeleteSelected = () => {
    if (selected.size === 0) return
    const updated = displayResults.filter((_, i) => !selected.has(i))
    setSavedResults(updated)
    saveResults(updated)
    setSelected(new Set())
  }

  const isActive = isScraping || (job && job.status !== 'done' && job.status !== 'error' && job.status !== 'cancelled')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Google Maps Scraper</h2>
        <p className="text-slate-400 text-sm">Extraia leads diretamente do Google Maps. Chrome roda em segundo plano com preview ao vivo.</p>
      </div>

      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ex: restaurante, clinica, escritorio advocacia...'
              disabled={isScraping}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition disabled:opacity-50"
            />
          </div>
          {!isScraping ? (
            <button
              onClick={handleScrape}
              disabled={!query.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
            >
              <Play size={18} /> Scrapar
            </button>
          ) : (
            <button
              onClick={cancelScrape}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-6 py-3 rounded-lg hover:from-red-400 hover:to-red-500 transition-all shadow-lg shadow-red-500/20"
            >
              <XCircle size={18} /> Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nicho</label>
            <select
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={isScraping}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="">Selecionar nicho...</option>
              {NICHOS.filter(Boolean).map(n => (
                <option key={n} value={n.toLowerCase()}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Cidade</label>
            <select
              disabled={isScraping}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition appearance-none cursor-pointer disabled:opacity-50"
              onChange={e => {
                if (e.target.value) setQuery(prev => prev ? `${prev} ${e.target.value}`.trim() : e.target.value)
              }}
            >
              <option value="">Selecionar cidade...</option>
              {CIDADES_PRINCIPAIS.filter(Boolean).map(c => (
                <option key={c} value={c.toLowerCase()}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Estado</label>
            <select
              disabled={isScraping}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition appearance-none cursor-pointer disabled:opacity-50"
              onChange={e => {
                if (e.target.value) setQuery(prev => prev ? `${prev} ${e.target.value}`.trim() : e.target.value)
              }}
            >
              <option value="">Selecionar estado...</option>
              {ESTADOS.filter(e => e.sigla).map(e => (
                <option key={e.sigla} value={e.sigla.toLowerCase()}>{e.nome} ({e.sigla})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Quantidade</label>
            <div className="flex">
              <input
                type="number"
                value={limit || ''}
                onChange={e => setLimit(parseInt(e.target.value) || 0)}
                placeholder="Todos"
                min={0}
                max={500}
                disabled={isScraping}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-l-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition disabled:opacity-50"
              />
              <button
                onClick={() => setLimit(0)}
                disabled={isScraping}
                className={`px-3 py-2 rounded-r-lg border text-xs transition ${limit === 0 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'} disabled:opacity-50`}
              >
                Full
              </button>
            </div>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 size={16} className="animate-spin text-cyan-400" />
                <span className="text-cyan-400">Scraping em andamento...</span>
              </div>
              <span className="text-xs text-slate-500">{job?.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${job?.progress || 0}%` }} />
            </div>
            <div className="max-h-24 overflow-y-auto text-xs text-slate-400 space-y-0.5 font-mono">
              {job?.messages.slice(-5).map((msg, i) => (
                <div key={i}>* {msg}</div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Eye size={14} />
                <span>Preview ao vivo do Chrome</span>
              </div>
              <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-slate-500 hover:text-white transition">
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showPreview && (
              <div ref={previewRef} className="h-64 overflow-auto bg-black flex items-center justify-center">
                {latestScreenshot ? (
                  <img src={`data:image/png;base64,${latestScreenshot}`} alt="Chrome preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-600 text-sm">Aguardando Chrome...</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{displayResults.length} Leads</h3>
              <button onClick={toggleAll} className="text-xs text-cyan-400 hover:text-cyan-300 transition">
                {selected.size === displayResults.length ? 'Desmarcar' : 'Selecionar todos'}
              </button>
              <span className="text-xs text-slate-500">{selected.size} selecionados</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleEnrich}
                disabled={selected.size === 0 || enriching}
                className="flex items-center gap-1 text-sm text-slate-300 bg-slate-800/50 border border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-700/50 hover:text-white transition disabled:opacity-40"
              >
                {enriching ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                {enriching ? enrichProgress || 'Buscando...' : 'Buscar Responsavel'}
              </button>
              <button onClick={handleClearSaved} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-700/50">
                <RotateCcw size={14} /> Limpar
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-5 py-2 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 text-sm"
              >
                <Download size={16} />
                {importing ? 'Importando...' : `Importar ${selected.size} Leads`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300">
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={selected.size === displayResults.length && displayResults.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left min-w-[160px]">Telefone</th>
                  <th className="p-3 text-left">Responsavel</th>
                  <th className="p-3 text-left">Endereco</th>
                  <th className="p-3 text-left">Avaliacao</th>
                  <th className="p-3 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((r, idx) => (
                  <tr key={idx} className={`border-t border-slate-800 hover:bg-slate-800/50 transition cursor-pointer ${selected.has(idx) ? 'bg-cyan-500/10' : ''}`} onClick={() => toggleSelect(idx)}>
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(idx)} onChange={() => toggleSelect(idx)} onClick={e => e.stopPropagation()} className="rounded" />
                    </td>
                    <td className="p-3">
                      <div className="text-white font-medium">{r.Name}</div>
                      {r.Website && (
                        <a href={r.Website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5">
                          <Globe size={10} /> Site
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded-full px-3 py-1 text-xs font-semibold">
                        <Phone size={12} />
                        {formatPhone(r.Phone) || '---'}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.Responsavel ? (
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                          <User size={12} /> {r.Responsavel}
                        </div>
                      ) : r.Socios ? (
                        <div className="text-slate-400 text-xs">{r.Socios}</div>
                      ) : enrichedNames.has(r.Name) ? (
                        <span className="text-red-400/70 text-xs italic">Não Localizado</span>
                      ) : (
                        <span className="text-slate-600 text-xs">---</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 max-w-[200px] truncate text-xs">
                      <span className="flex items-center gap-1"><MapPin size={11} /> {r.Address || '---'}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={12} className="text-yellow-400" />
                        <span className="text-white">{r.Rating ? r.Rating.split(' ')[0] : '---'}</span>
                      </div>
                      {r['Total Reviews'] && (
                        <div className="text-xs text-slate-500">{r['Total Reviews']}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLeadDetail(r) }}
                          title="Ver detalhes"
                          className="p-1 rounded bg-slate-800/50 hover:bg-cyan-500/20 transition-colors text-cyan-400"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            setEnriching(true)
                            setEnrichProgress(`Re-buscando: ${r.Name}...`)
                            try {
                              const data = await enrichLead(r.Website || '', r.Name, extractCity(r.Address), r.Phone || '')
                              const updated = [...displayResults]
                              updated[idx] = { ...r, ...data }
                              setSavedResults(updated)
                              saveResults(updated)
                              const newEnriched = new Set(enrichedNames)
                              newEnriched.add(r.Name)
                              setEnrichedNames(newEnriched)
                            } catch {}
                            setEnriching(false)
                            setEnrichProgress('')
                          }}
                          disabled={enriching}
                          title="Re-buscar responsavel"
                          className="p-1 rounded bg-slate-800/50 hover:bg-amber-500/20 transition-colors text-amber-400 disabled:opacity-40"
                        >
                          <ArrowDownUp size={14} />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            setEnriching(true)
                            const updated = [...displayResults]
                            const lead = updated[idx]
                            if (!lead.Responsavel) {
                              try {
                                const data = await enrichLead(lead.Website || '', lead.Name, extractCity(lead.Address), lead.Phone || '')
                                updated[idx] = { ...lead, ...data }
                              } catch {}
                            }
                            const current = updated[idx]
                            const social = await searchSocialMedia(current.Responsavel || '', current.Name, extractCity(current.Address), current.NomeFantasia || current.Name, current.Website || '')
                            updated[idx] = { ...current, SocialMedia: social }
                            setSavedResults(updated)
                            saveResults(updated)
                            setEnriching(false)
                          }}
                          disabled={enriching}
                          title="Buscar dados + redes sociais"
                          className="p-1 rounded bg-slate-800/50 hover:bg-purple-500/20 transition-colors text-purple-400 disabled:opacity-40"
                        >
                          {r.SocialMedia && Object.values(r.SocialMedia).some(p => p?.url)
                            ? <Share2 size={14} className="text-green-400" />
                            : <Share2 size={14} />
                          }
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = displayResults.filter((_, i) => i !== idx)
                            setSavedResults(updated)
                            saveResults(updated)
                            setSelected(prev => {
                              const next = new Set(prev)
                              next.delete(idx)
                              const adjusted = new Set<number>()
                              for (const i of next) adjusted.add(i > idx ? i - 1 : i)
                              return adjusted
                            })
                          }}
                          title="Excluir lead"
                          className="p-1 rounded bg-slate-800/50 hover:bg-red-500/20 transition-colors text-red-400"
                        >
                          <XCircle size={14} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showResults && !isActive && (
        <div className="bg-slate-800/20 border border-dashed border-slate-700 rounded-xl p-12 text-center">
          <MapPin size={48} className="mx-auto text-slate-600 mb-4" />
          {job?.status === 'done' && job.results.length === 0 ? (
            <>
              <p className="text-amber-400 text-lg mb-2">Nenhum resultado encontrado</p>
              <p className="text-slate-500 text-sm">A busca retornou 0 leads. Tente ampliar os filtros ou usar outro termo.</p>
            </>
          ) : (
            <>
              <p className="text-slate-500 text-lg mb-2">Nenhuma busca realizada</p>
              <p className="text-slate-600 text-sm">Selecione nicho + cidade nos filtros acima ou digite diretamente</p>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['restaurante sao paulo', 'clinica odontologica rio de janeiro', 'escritorio advocacia belo horizonte', 'academia curitiba', 'corretora de seguros sao paulo'].map(ex => (
              <button key={ex} onClick={() => setQuery(ex)} className="text-xs bg-slate-800/50 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-full hover:bg-slate-700/50 hover:text-white transition">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
      <LeadDetailPopup lead={selectedLeadDetail} onClose={() => setSelectedLeadDetail(null)} />
    </div>
  )
}
