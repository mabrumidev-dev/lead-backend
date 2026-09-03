import { useState, useEffect, useRef } from 'react'
import { Search, Play, XCircle, Loader2, MapPin, Phone, Globe, Star, Download, RotateCcw, Eye, User, Building2, ChevronDown, ArrowDownUp, Share2, Zap, Activity, X } from 'lucide-react'
import { useScraper, ScrapedLead } from '@/hooks/useScraper'
import LeadDetailPopup from '@/components/leads/LeadDetailPopup'
import { supabase } from '@/hooks/useLeads'
import { Lead } from '@/types/lead'

interface Props {
  onImportComplete: (leads: Lead[]) => void
  showToast?: (message: string, type?: string) => void
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

function extractCity(address: string | null): string {
  if (!address) return 'Sao Paulo'
  const parts = address.split(',').map(p => p.trim())
  for (let i = parts.length - 1; i >= 0; i--) {
    let part = parts[i].replace(/\d{5}-?\d{3}/g, '').trim()
    if (!part) continue
    const sub = part.split('-').map(s => s.trim()).filter(s => s && !/^\d+$/.test(s) && !/^[A-Z]{2}$/i.test(s) && !['Brazil', 'Brasil', 'BR'].includes(s))
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
  if (rating) { const r = parseFloat(rating.replace(',', '.')); if (!isNaN(r)) score = Math.round(r * 20) }
  if (reviews) { const revNum = parseInt(reviews.replace(/\D/g, '')); if (!isNaN(revNum) && revNum > 100) score = Math.min(100, score + 10) }
  return score
}

function loadSavedResults(): ScrapedLead[] | null {
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) return JSON.parse(saved) } catch {}
  return null
}

function saveResults(results: ScrapedLead[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)) } catch {}
}

export function GoogleMapsScraper({ onImportComplete, showToast }: Props) {
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
      if (job.results.length > 0) { setSavedResults(job.results); saveResults(job.results) }
      else { setSavedResults([]); saveResults([]) }
    }
  }, [job?.status, job?.results])

  useEffect(() => {
    if (previewRef.current && job?.screenshots && job.screenshots.length > 0) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [job?.screenshots?.length])

  // Pre-fill search from trash "Re-buscar" button
  useEffect(() => {
    const rescraperName = sessionStorage.getItem('rescraper_name')
    if (rescraperName) {
      setQuery(rescraperName)
      sessionStorage.removeItem('rescraper_name')
      sessionStorage.removeItem('rescraper_cnpj')
    }
  }, [])

  const latestScreenshot = job?.screenshots && job.screenshots.length > 0 ? job.screenshots[job.screenshots.length - 1] : null
  const displayResults = savedResults.length > 0 ? savedResults : (job?.status === 'done' ? job.results : [])
  const showResults = displayResults && displayResults.length > 0
  const isActive = isScraping || (job && job.status !== 'done' && job.status !== 'error' && job.status !== 'cancelled')

  const handleScrape = () => { if (!query.trim()) return; setSelected(new Set()); startScrape(query, limit) }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !isScraping) handleScrape() }
  const toggleSelect = (idx: number) => { setSelected(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next }) }
  const toggleAll = () => { if (!displayResults) return; if (selected.size === displayResults.length) setSelected(new Set()); else setSelected(new Set(displayResults.map((_, i) => i))) }

  const handleEnrich = async () => {
    if (!displayResults || selected.size === 0) return
    setEnriching(true)
    const updated = [...displayResults]
    const selectedArr = Array.from(selected)
    let enriched = 0, socialFound = 0
    const newEnriched = new Set(enrichedNames)

    for (let i = 0; i < selectedArr.length; i++) {
      const idx = selectedArr[i]
      const lead = updated[idx]

      if (!lead.Responsavel) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: ${lead.Name}...`)
        try {
          const data = await enrichLead(lead.Website || '', lead.Name, extractCity(lead.Address), lead.Phone || '')
          updated[idx] = { ...lead, ...data }
          newEnriched.add(lead.Name)
          if (data.Responsavel || data.CNPJ) enriched++
        } catch { newEnriched.add(lead.Name) }
      }

      const current = updated[idx]
      const personName = current.Responsavel || ''
      const bizName = current.NomeFantasia || current.Name || ''
      if (personName || bizName) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Redes sociais...`)
        try {
          const social = await searchSocialMedia(personName, current.Name, extractCity(current.Address), bizName, current.Website || '')
          updated[idx] = { ...current, SocialMedia: social }
          if (Object.keys(social).filter(p => social[p]?.url).length > 0) socialFound++
        } catch {}
      }

      const lead2 = updated[idx]
      if (lead2.CNPJ || lead2.Name) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Plano de saúde...`)
        try { const hp = await checkHealthPlan(lead2.CNPJ || '', lead2.Name || '', lead2.Porte || '', String(lead2.QSA?.length || 0), String(lead2.CapitalSocial || ''), String(lead2.CNAEFiscal || '')); updated[idx] = { ...lead2, HealthPlan: hp } } catch {}
      }

      const lead3 = updated[idx]
      if (lead3.Name) {
        setEnrichProgress(`${i + 1}/${selectedArr.length}: Colaboradores...`)
        try { const ec = await checkEmployeeCount(lead3.Name || lead3.NomeFantasia || '', lead3.CNPJ || '', lead3.Porte || '', String(lead3.CapitalSocial || ''), String(lead3.CNAEFiscal || '')); updated[idx] = { ...lead3, EmployeeCount: ec } } catch {}
      }
    }

    setSavedResults(updated); saveResults(updated); setEnrichedNames(newEnriched); setEnriching(false)
    const parts = []
    if (enriched > 0) parts.push(`${enriched} responsável(is)`)
    if (socialFound > 0) parts.push(`${socialFound} rede(s) social(is)`)
    const hpFound = updated.filter(u => u.HealthPlan?.tem_plano === true).length
    if (hpFound > 0) parts.push(`${hpFound} plano(s)`)
    const ecFound = updated.filter(u => u.EmployeeCount?.fonte).length
    if (ecFound > 0) parts.push(`${ecFound} colaborador(es)`)
    setEnrichProgress(parts.length > 0 ? parts.join(' + ') : 'Nenhum dado novo')
    setTimeout(() => setEnrichProgress(''), 5000)
  }

  const handleImport = async () => {
    if (!displayResults || selected.size === 0) return
    setImporting(true)
    try {
      // Step 1: Get existing phone numbers from Supabase to detect duplicates
      const selectedLeads = Array.from(selected).map(idx => {
        const r = displayResults[idx]
        const telefone = formatPhone(r.Phone)
        return { idx, r, telefone, phoneDigits: telefone.replace(/\D/g, '') }
      })

      const phoneNumbers = selectedLeads.map(l => l.phoneDigits).filter(Boolean)
      let existingPhones = new Set<string>()
      if (phoneNumbers.length > 0) {
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('telefone')
          .in('telefone', phoneNumbers)
        if (existingLeads) {
          existingLeads.forEach((l: any) => {
            const digits = (l.telefone || '').replace(/\D/g, '')
            if (digits) existingPhones.add(digits)
          })
        }
      }

      // Step 2: Filter out duplicates
      const newLeads = selectedLeads.filter(l => !existingPhones.has(l.phoneDigits))
      const duplicateCount = selectedLeads.length - newLeads.length

      if (newLeads.length === 0) {
        alert(`Todos os ${selectedLeads.length} lead(s) já existem no banco!`)
        setImporting(false)
        return
      }

      // Step 3: Build rows with enriched data
      const enrichedData: Record<string, any> = {}
      const leadsToImport = newLeads.map(({ r, telefone, phoneDigits }) => {
        const enrichedPayload = {
          Responsavel: r.Responsavel || '', Socios: r.Socios || '', CNPJ: r.CNPJ || '',
          RazaoSocial: r.RazaoSocial || '', NomeFantasia: r.NomeFantasia || '',
          SituacaoCadastral: r.SituacaoCadastral || '', Porte: r.Porte || '',
          CapitalSocial: r.CapitalSocial || '', AtividadePrincipal: r.AtividadePrincipal || '',
          CNAEFiscal: r.CNAEFiscal || '', QSA: r.QSA || [],
          SocialMedia: r.SocialMedia || {}, HealthPlan: r.HealthPlan || null,
          EmployeeCount: r.EmployeeCount || null,
          Address: r.Address || '', Website: r.Website || '',
          Rating: r.Rating || '', 'Total Reviews': r['Total Reviews'] || '',
          Email: r.Email || '', CEP: r.CEP || '', UF: r.UF || '',
          Municipio: r.Municipio || '', Bairro: r.Bairro || '',
          EnderecoCompleto: r.EnderecoCompleto || '',
          Telefone1: r.Telefone1 || '', Telefone2: r.Telefone2 || '',
          NaturezaJuridica: r.NaturezaJuridica || '',
          DataInicioAtividade: r.DataInicioAtividade || '',
          IdentificadorMatrizFilial: r.IdentificadorMatrizFilial || '',
          RegimeTributario: r.RegimeTributario || [],
          CnaesSecundarios: r.CnaesSecundarios || [],
          OpcaoSimples: r.OpcaoSimples, OpcaoMEI: r.OpcaoMEI,
        }
        enrichedData[phoneDigits] = enrichedPayload
        return {
          id: crypto.randomUUID(),
          nome: r.Name || '',
          telefone,
          cidade: extractCity(r.Address),
          plano: 'Individual',
          score: calculateScore(r.Rating, r['Total Reviews']),
          website: r.Website || null,
          cnpj: r.CNPJ || null,
          responsavel: r.Responsavel || null,
          enriched_data: enrichedPayload,
          created_at: new Date().toISOString(),
        }
      })

      // Try full insert first (with enriched columns)
      let { error } = await supabase.from('leads').insert(leadsToImport)
      
      // If schema doesn't have new columns yet, fall back to basic insert
      if (error && (error.message?.includes('schema cache') || error.message?.includes('column'))) {
        console.warn('[IMPORT] Colunas novas não existem ainda, usando insert básico. Rode a migration SQL!')
        const basicRows = leadsToImport.map(row => ({
          id: row.id,
          nome: row.nome,
          telefone: row.telefone,
          cidade: row.cidade,
          plano: row.plano,
          score: row.score,
          created_at: row.created_at,
        }))
        const fallback = await supabase.from('leads').insert(basicRows)
        if (fallback.error) throw fallback.error
      } else if (error) {
        throw error
      }

      // Also save to localStorage for backward compat
      const existingLocal = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
      localStorage.setItem('mabrumi_enriched_leads', JSON.stringify({ ...existingLocal, ...enrichedData }))

      onImportComplete(leadsToImport)
      const remaining = displayResults.filter((_, i) => !selected.has(i))
      setSavedResults(remaining)
      if (remaining.length > 0) saveResults(remaining); else { localStorage.removeItem(STORAGE_KEY); reset() }
      setQuery(''); setSelected(new Set())

      const msg = `${newLeads.length} lead(s) importado(s)${duplicateCount > 0 ? ` (${duplicateCount} duplicado(s) ignorado(s))` : ''}`
      showToast(msg, 'success')
    } catch (err: any) { alert('Erro: ' + (err.message || 'Desconhecido')) } finally { setImporting(false) }
  }

  const handleClearSaved = () => { setSavedResults([]); setSelected(new Set()); localStorage.removeItem(STORAGE_KEY); reset() }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
            <MapPin size={20} className="text-emerald-400" />
          </div>
          Google Maps Scraper
        </h2>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">Extraia leads diretamente do Google Maps com preview ao vivo</p>
      </div>


      {/* Search Panel */}
      <div className="glass p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder='Ex: restaurante, clinica, escritorio advocacia...'
              disabled={isScraping}
              className="input-field input-field-with-icon"
            />
          </div>
          {!isScraping ? (
            <button onClick={handleScrape} disabled={!query.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Play size={16} /> Scrapar
            </button>
          ) : (
            <button onClick={cancelScrape} className="btn-danger flex items-center gap-2 whitespace-nowrap">
              <XCircle size={16} /> Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Nicho</label>
            <select value={query} onChange={e => setQuery(e.target.value)} disabled={isScraping} className="input-field text-sm">
              <option value="">Selecionar...</option>
              {NICHOS.filter(Boolean).map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Cidade</label>
            <select disabled={isScraping} className="input-field text-sm" onChange={e => { if (e.target.value) setQuery(prev => prev ? `${prev} ${e.target.value}`.trim() : e.target.value) }}>
              <option value="">Selecionar...</option>
              {CIDADES_PRINCIPAIS.filter(Boolean).map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Estado</label>
            <select disabled={isScraping} className="input-field text-sm" onChange={e => { if (e.target.value) setQuery(prev => prev ? `${prev} ${e.target.value}`.trim() : e.target.value) }}>
              <option value="">Selecionar...</option>
              {ESTADOS.filter(e => e.sigla).map(e => <option key={e.sigla} value={e.sigla.toLowerCase()}>{e.nome} ({e.sigla})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Qtd</label>
            <div className="flex">
              <input type="number" value={limit || ''} onChange={e => setLimit(parseInt(e.target.value) || 0)} placeholder="Todos" min={0} max={500} disabled={isScraping} className="input-field text-sm rounded-r-none" />
              <button onClick={() => setLimit(0)} disabled={isScraping} className={`px-3 rounded-r-xl border text-xs font-medium transition-all ${limit === 0 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'}`}>
                Full
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          <div className="glass p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-cyan-400 animate-pulse" />
                <span className="text-sm text-cyan-400 font-medium">Scraping em andamento...</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{job?.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${job?.progress || 0}%` }} />
            </div>
            <div className="max-h-24 overflow-y-auto text-xs text-slate-500 space-y-0.5 font-mono">
              {job?.messages.slice(-5).map((msg, i) => <div key={i} className="flex gap-2"><span className="text-cyan-600">›</span> {msg}</div>)}
            </div>
          </div>
          <div className="glass overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Eye size={14} />
                <span>Preview ao vivo</span>
              </div>
              <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-slate-500 hover:text-white transition-colors">
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showPreview && (
              <div ref={previewRef} className="h-64 overflow-auto bg-black/50 flex items-center justify-center">
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

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{displayResults.length} Leads</h3>
              <button onClick={toggleAll} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                {selected.size === displayResults.length ? 'Desmarcar' : 'Selecionar todos'}
              </button>
              <span className="text-xs text-slate-500">{selected.size} selecionados</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleEnrich} disabled={selected.size === 0 || enriching} className="btn-ghost flex items-center gap-1.5 text-sm">
                {enriching ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                {enriching ? enrichProgress || 'Buscando...' : 'Enriquecer'}
              </button>
              <button onClick={handleClearSaved} className="btn-ghost flex items-center gap-1.5 text-sm">
                <RotateCcw size={14} /> Limpar
              </button>
              <button onClick={handleImport} disabled={selected.size === 0 || importing} className="btn-primary flex items-center gap-2 text-sm">
                <Download size={16} />
                {importing ? 'Importando...' : `Importar ${selected.size}`}
              </button>
            </div>
          </div>

          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10"><input type="checkbox" checked={selected.size === displayResults.length && displayResults.length > 0} onChange={toggleAll} /></th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Responsável</th>
                    <th>Endereço</th>
                    <th>Avaliação</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((r, idx) => (
                    <tr key={idx} className={selected.has(idx) ? 'selected' : ''} onClick={() => toggleSelect(idx)}>
                      <td><input type="checkbox" checked={selected.has(idx)} onChange={() => toggleSelect(idx)} onClick={e => e.stopPropagation()} /></td>
                      <td>
                        <div className="text-white font-medium text-[13px]">{r.Name}</div>
                        {r.Website && (
                          <a href={r.Website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5">
                            <Globe size={10} /> Site
                          </a>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-emerald">
                          <Phone size={10} />
                          {formatPhone(r.Phone) || '---'}
                        </span>
                      </td>
                      <td>
                        {r.Responsavel ? (
                          <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold"><User size={12} /> {r.Responsavel}</span>
                        ) : r.NomeFantasia || r.RazaoSocial ? (
                          <span className="text-cyan-400 text-xs"><Building2 size={11} className="inline mr-1" />{r.NomeFantasia || r.RazaoSocial}</span>
                        ) : enrichedNames.has(r.Name) ? (
                          <span className="text-rose-400/60 text-xs italic">Não localizado</span>
                        ) : (
                          <span className="text-slate-600 text-xs">---</span>
                        )}
                      </td>
                      <td className="text-slate-400 max-w-[200px] truncate text-xs">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {r.Address || '---'}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400" />
                          <span className="text-white text-sm">{r.Rating ? r.Rating.split(' ')[0] : '---'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedLeadDetail(r)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all" title="Detalhes">
                            <Eye size={14} />
                          </button>
                          <button onClick={async () => {
                            setEnriching(true); setEnrichProgress(`Re-buscando: ${r.Name}...`)
                            try { const data = await enrichLead(r.Website || '', r.Name, extractCity(r.Address), r.Phone || ''); const updated = [...displayResults]; updated[idx] = { ...r, ...data }; setSavedResults(updated); saveResults(updated); const n = new Set(enrichedNames); n.add(r.Name); setEnrichedNames(n) } catch {}
                            setEnriching(false); setEnrichProgress('')
                          }} disabled={enriching} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition-all" title="Re-buscar">
                            <ArrowDownUp size={14} />
                          </button>
                          <button onClick={() => { const updated = displayResults.filter((_, i) => i !== idx); setSavedResults(updated); saveResults(updated) }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all" title="Excluir">
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!showResults && !isActive && (
        <div className="glass p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-slate-600" />
          </div>
          {job?.status === 'error' ? (
            <>
              <p className="text-rose-400 text-lg mb-2">Erro na conexão</p>
              <p className="text-slate-500 text-sm">{job.messages[job.messages.length - 1] || 'Conexão perdida com o servidor'}</p>
              <button onClick={() => { reset(); setQuery('') }} className="btn-primary mt-4 text-sm">Tentar novamente</button>
            </>
          ) : job?.status === 'cancelled' ? (
            <>
              <p className="text-amber-400 text-lg mb-2">Scraping cancelado</p>
              <p className="text-slate-500 text-sm">O scraping foi interrompido pelo usuário</p>
            </>
          ) : job?.status === 'done' && job.results.length === 0 ? (
            <>
              <p className="text-amber-400 text-lg mb-2">Nenhum resultado</p>
              <p className="text-slate-500 text-sm">Tente ampliar os filtros ou usar outro termo</p>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-lg mb-2">Pronto para scrapar</p>
              <p className="text-slate-600 text-sm">Selecione nicho + cidade ou digite diretamente</p>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['restaurante sao paulo', 'clinica odontologica rio de janeiro', 'escritorio advocacia belo horizonte', 'academia curitiba', 'corretora de seguros sao paulo'].map(ex => (
              <button key={ex} onClick={() => setQuery(ex)} className="btn-ghost text-xs px-3 py-1.5 rounded-full">
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
