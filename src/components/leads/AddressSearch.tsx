import { useState, useCallback } from 'react'
import { Search, MapPin, Building2, Phone, Mail, Star, Loader2, Filter, ChevronDown, Eye, Plus, Zap, Globe, ArrowDownUp, XCircle, FileText, Download, User } from 'lucide-react'
import { supabase } from '@/hooks/useLeads'
import { Lead } from '@/types/lead'

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? window.location.origin : 'http://localhost:8002')

interface AddressResult {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  endereco: string
  bairro: string
  cep: string
  uf: string
  municipio: string
  telefone_1: string
  telefone_2: string
  email: string
  cnae_fiscal: string
  cnae_fiscal_descricao: string
  situacao_cadastral: string
  porte: string
  capital_social: number | null
  natureza_juridica: string
  opcao_simples: boolean | null
  opcao_mei: boolean | null
  identificador_matriz_filial: string
  data_inicio_atividade: string
}

interface SearchResult {
  total: number
  filtros: Record<string, string | null>
  results: AddressResult[]
}

const UFS = [
  '', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const PORTE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '01', label: 'ME — Microempresa' },
  { value: '03', label: 'EPP — Empresa Peq. Porte' },
  { value: '05', label: 'Demais' },
]

const SITUACAO_OPTIONS = [
  { value: '02', label: 'Ativa' },
  { value: '', label: 'Todas' },
  { value: '01', label: 'Nula' },
  { value: '03', label: 'Suspensa' },
  { value: '04', label: 'Inapta' },
  { value: '08', label: 'Baixada' },
]

function fmtCNPJ(v: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return v
}

function fmtPhone(v: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return v
}

function fmtCurrency(v: number | null) {
  if (v === null || v === undefined) return ''
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function porteLabel(v: string) {
  const map: Record<string, string> = { '01': 'ME', '03': 'EPP', '05': 'Demais' }
  return map[v] || v || '—'
}

function situacaoLabel(v: string) {
  const map: Record<string, string> = {
    '01': 'Nula', '02': 'Ativa', '03': 'Suspensa', '04': 'Inapta',
    '08': 'Baixada'
  }
  return map[v] || v || '—'
}

interface Props {
  onAddToBase: (lead: Lead) => void
  showToast: (msg: string, type?: string) => void
  baseLeadIds: string[]
}

export default function AddressSearch({ onAddToBase, showToast, baseLeadIds }: Props) {
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [bairro, setBairro] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [cnae, setCnae] = useState('')
  const [porte, setPorte] = useState('')
  const [situacao, setSituacao] = useState('02')
  const [limit, setLimit] = useState(20)
  const [showFilters, setShowFilters] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [total, setTotal] = useState(0)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewDetail, setViewDetail] = useState<AddressResult | null>(null)

  const handleSearch = useCallback(async () => {
    if (!cep && !logradouro && !bairro && !municipio && !uf) {
      setError('Informe pelo menos um filtro de endereço')
      return
    }

    setLoading(true)
    setError('')
    setSearched(true)
    setSelected(new Set())

    try {
      const params = new URLSearchParams()
      if (cep) params.set('cep', cep.replace(/\D/g, ''))
      if (logradouro) params.set('logradouro', logradouro)
      if (bairro) params.set('bairro', bairro)
      if (municipio) params.set('municipio', municipio)
      if (uf) params.set('uf', uf)
      if (cnae) params.set('cnae', cnae)
      if (porte) params.set('porte', porte)
      if (situacao) params.set('situacao', situacao)
      params.set('limit', String(limit))

      const resp = await fetch(`${API_BASE}/api/cnpj/busca-endereco?${params}`)
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.detail || `Erro ${resp.status}`)
      }

      const data: SearchResult = await resp.json()
      setResults(data.results)
      setTotal(data.total)
      if (data.total === 0) {
        showToast('Nenhuma empresa encontrada com esses filtros', 'info')
      } else {
        showToast(`${data.total} empresa(s) encontrada(s)`, 'success')
      }
    } catch (err: any) {
      setError(err.message || 'Erro na busca')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [cep, logradouro, bairro, municipio, uf, cnae, porte, situacao, limit, showToast])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const toggleSelect = (cnpj: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cnpj)) next.delete(cnpj)
      else next.add(cnpj)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map(r => r.cnpj)))
  }

  const handleAddSelected = () => {
    const toAdd = results.filter(r => selected.has(r.cnpj))
    if (toAdd.length === 0) return

    let added = 0
    for (const r of toAdd) {
      if (baseLeadIds.includes(r.cnpj)) continue
      const lead: Lead = {
        id: crypto.randomUUID(),
        name: r.nome_fantasia || r.razao_social || 'Empresa',
        email: r.email || 'N/A',
        phone: r.telefone_1 || '',
        city: r.municipio || '',
        plan: 'Empresarial',
        status: 'new',
        score: 70,
        source: 'Google Maps',
        created_at: new Date().toISOString(),
        cnpj: r.cnpj,
        enriched_data: {
          CNPJ: r.cnpj,
          RazaoSocial: r.razao_social,
          NomeFantasia: r.nome_fantasia,
          Porte: porteLabel(r.porte),
          CapitalSocial: r.capital_social,
          AtividadePrincipal: r.cnae_fiscal_descricao,
          CNAEFiscal: r.cnae_fiscal,
          SituacaoCadastral: situacaoLabel(r.situacao_cadastral),
          NaturezaJuridica: r.natureza_juridica,
          OpcaoSimples: r.opcao_simples,
          OpcaoMEI: r.opcao_mei,
          EnderecoCompleto: r.endereco,
          Bairro: r.bairro,
          CEP: r.cep,
          UF: r.uf,
          Municipio: r.municipio,
          Telefone1: r.telefone_1,
          Telefone2: r.telefone_2,
          Email: r.email,
          DataInicioAtividade: r.data_inicio_atividade,
          IdentificadorMatrizFilial: r.identificador_matriz_filial === '1' ? 'Matriz' : r.identificador_matriz_filial === '2' ? 'Filial' : r.identificador_matriz_filial,
        }
      }
      onAddToBase(lead)
      added++
    }

    showToast(`${added} empresa(s) adicionada(s) à base!`, 'success')
    setSelected(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Search Panel */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Busca por Endereço</h3>
          <button onClick={() => setShowFilters(!showFilters)} className="ml-auto btn-ghost text-xs px-2 py-1">
            <Filter size={12} className="inline mr-1" />
            {showFilters ? 'Ocultar filtros' : 'Mais filtros'}
          </button>
        </div>

        {/* Primary filters — always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">CEP</label>
            <input
              type="text" value={cep} onChange={e => setCep(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="01310-100" maxLength={9}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Rua / Avenida</label>
            <input
              type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Av. Paulista, Rua Augusta..."
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">UF</label>
            <select value={uf} onChange={e => setUf(e.target.value)} className="input-field">
              {UFS.map(u => <option key={u} value={u}>{u || 'Todos'}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Município</label>
            <input
              type="text" value={municipio} onChange={e => setMunicipio(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="São Paulo, Rio de Janeiro..."
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Bairro</label>
            <input
              type="text" value={bairro} onChange={e => setBairro(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Bela Vista, Copacabana..."
              className="input-field"
            />
          </div>
        </div>

        {/* Advanced filters — collapsible */}
        {showFilters && (
          <div className="border-t border-slate-700/50 pt-3 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">CNAE (Atividade)</label>
                <input
                  type="text" value={cnae} onChange={e => setCnae(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Ex: 6621-5/00"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Porte</label>
                <select value={porte} onChange={e => setPorte(e.target.value)} className="input-field">
                  {PORTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Situação</label>
                <select value={situacao} onChange={e => setSituacao(e.target.value)} className="input-field">
                  {SITUACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Limite</label>
                <input
                  type="number" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 20)}
                  min={1} max={100} className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-3">
          <button onClick={handleSearch} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Buscando...</> : <><Search size={16} /> Buscar Empresas</>}
          </button>
          {results.length > 0 && (
            <button onClick={() => { setResults([]); setTotal(0); setSearched(false); setSelected(new Set()) }} className="btn-ghost">
              Limpar
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="glass-sm p-3 border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-scale-in">
          <span className="text-sm text-cyan-400 font-medium">{selected.size} selecionada(s)</span>
          <div className="flex gap-2 sm:ml-auto">
            <button onClick={handleAddSelected} className="btn-primary text-xs flex items-center gap-1.5">
              <Plus size={13} /> Adicionar na Base
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs">
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="glass overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-cyan-400" />
              <span className="text-sm text-slate-300">{total} empresa(s) encontrada(s)</span>
            </div>
            {results.length > 0 && (
              <button onClick={toggleSelectAll} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                {selected.size === results.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma empresa encontrada</p>
              <p className="text-slate-600 text-sm mt-1">Tente ampliar os filtros ou usar outro CEP/rua</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input type="checkbox" checked={selected.size === results.length && results.length > 0} onChange={toggleSelectAll} />
                    </th>
                    <th>Empresa</th>
                    <th>CNPJ</th>
                    <th>Endereço</th>
                    <th>Telefone</th>
                    <th>Atividade</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const isSelected = selected.has(r.cnpj)
                    const isBase = baseLeadIds.includes(r.cnpj)
                    const displayName = r.nome_fantasia || r.razao_social || 'Empresa'

                    return (
                      <tr key={r.cnpj} className={isSelected ? 'selected' : ''}>
                        <td>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.cnpj)} />
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/15 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                              {displayName[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium text-[13px] truncate max-w-[200px]">{displayName}</p>
                              {r.nome_fantasia && r.razao_social && r.nome_fantasia !== r.razao_social && (
                                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{r.razao_social}</p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5">
                                {r.situacao_cadastral === '02' && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold">ATIVA</span>
                                )}
                                {r.porte && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[9px] font-bold">{porteLabel(r.porte)}</span>
                                )}
                                {r.opcao_simples && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-bold">S.N.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs text-slate-300 font-mono">{fmtCNPJ(r.cnpj)}</span>
                        </td>
                        <td>
                          <div className="text-xs text-slate-400 max-w-[200px]">
                            <p className="truncate">{r.endereco}</p>
                            <p>{r.bairro}{r.bairro && r.municipio ? ' — ' : ''}{r.municipio}/{r.uf}</p>
                            {r.cep && <p className="text-slate-500">{r.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}</p>}
                          </div>
                        </td>
                        <td>
                          {r.telefone_1 ? (
                            <a href={`tel:${r.telefone_1}`} className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors">
                              {fmtPhone(r.telefone_1)}
                            </a>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <p className="text-xs text-slate-300 truncate max-w-[180px]">{r.cnae_fiscal_descricao || '—'}</p>
                          {r.cnae_fiscal && <p className="text-[10px] text-slate-500">{r.cnae_fiscal}</p>}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setViewDetail(r)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all" title="Ver detalhes">
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (isBase) return
                                const lead: Lead = {
                                  id: crypto.randomUUID(),
                                  name: displayName,
                                  email: r.email || 'N/A',
                                  phone: r.telefone_1 || '',
                                  city: r.municipio || '',
                                  plan: 'Empresarial',
                                  status: 'new',
                                  score: 70,
                                  source: 'Google Maps',
                                  created_at: new Date().toISOString(),
                                  cnpj: r.cnpj,
                                  enriched_data: {
                                    CNPJ: r.cnpj, RazaoSocial: r.razao_social, NomeFantasia: r.nome_fantasia,
                                    Porte: porteLabel(r.porte), CapitalSocial: r.capital_social,
                                    AtividadePrincipal: r.cnae_fiscal_descricao, CNAEFiscal: r.cnae_fiscal,
                                    SituacaoCadastral: situacaoLabel(r.situacao_cadastral),
                                    EnderecoCompleto: r.endereco, Bairro: r.bairro, CEP: r.cep,
                                    UF: r.uf, Municipio: r.municipio, Telefone1: r.telefone_1,
                                    Telefone2: r.telefone_2, Email: r.email,
                                    OpcaoSimples: r.opcao_simples, OpcaoMEI: r.opcao_mei,
                                  }
                                }
                                onAddToBase(lead)
                                showToast(`${displayName} adicionada!`, 'success')
                              }}
                              disabled={isBase}
                              className={`p-1.5 rounded-lg transition-all ${isBase ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'}`}
                              title={isBase ? 'Já na base' : 'Adicionar à base'}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewDetail(null)}>
          <div className="relative w-full max-w-3xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewDetail(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
              <XCircle size={18} />
            </button>
            <div className="p-5">
              <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{viewDetail.nome_fantasia || viewDetail.razao_social || 'Empresa'}</h2>
              <p className="text-xs text-slate-500 mb-4">{fmtCNPJ(viewDetail.cnpj)}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <Field emoji="📋" label="Razão Social" value={viewDetail.razao_social} />
                <Field emoji="🏷️" label="Nome Fantasia" value={viewDetail.nome_fantasia} />
                <Field emoji="📊" label="Porte" value={porteLabel(viewDetail.porte)} />
                <Field emoji="🏛️" label="Natureza Jurídica" value={viewDetail.natureza_juridica} />
                <Field emoji="💰" label="Capital Social" value={viewDetail.capital_social ? fmtCurrency(viewDetail.capital_social) : null} />
                <Field emoji="✅" label="Situação" value={situacaoLabel(viewDetail.situacao_cadastral)} />
                <Field emoji="⚙️" label="Atividade Principal" value={viewDetail.cnae_fiscal_descricao} />
                <Field emoji="🔢" label="CNAE" value={viewDetail.cnae_fiscal} />
                <Field emoji="📅" label="Início Atividade" value={viewDetail.data_inicio_atividade} />
                <Field emoji="🏷️" label="Tipo" value={viewDetail.identificador_matriz_filial === '1' ? 'Matriz' : viewDetail.identificador_matriz_filial === '2' ? 'Filial' : viewDetail.identificador_matriz_filial} />
                <Field emoji="✅" label="Simples Nacional" value={viewDetail.opcao_simples === true ? 'Sim' : viewDetail.opcao_simples === false ? 'Não' : null} />
                <Field emoji="🏠" label="MEI" value={viewDetail.opcao_mei === true ? 'Sim' : viewDetail.opcao_mei === false ? 'Não' : null} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Endereço</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <Field emoji="🏠" label="Logradouro" value={viewDetail.endereco} />
                <Field emoji="📍" label="Bairro" value={viewDetail.bairro} />
                <Field emoji="📮" label="CEP" value={viewDetail.cep ? viewDetail.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : null} />
                <Field emoji="🏙️" label="Município" value={viewDetail.municipio} />
                <Field emoji="🗺️" label="UF" value={viewDetail.uf} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <Phone size={14} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Contato</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <Field emoji="📱" label="Telefone 1" value={viewDetail.telefone_1 ? fmtPhone(viewDetail.telefone_1) : null} />
                <Field emoji="📱" label="Telefone 2" value={viewDetail.telefone_2 ? fmtPhone(viewDetail.telefone_2) : null} />
                <Field emoji="✉️" label="Email" value={viewDetail.email} />
              </div>

              <div className="border-t border-slate-700 mt-4 pt-4 flex gap-2">
                <button onClick={() => {
                  const lead: Lead = {
                    id: crypto.randomUUID(), name: viewDetail.nome_fantasia || viewDetail.razao_social || 'Empresa',
                    email: viewDetail.email || 'N/A', phone: viewDetail.telefone_1 || '', city: viewDetail.municipio || '',
                    plan: 'Empresarial', status: 'new', score: 70, source: 'Google Maps', created_at: new Date().toISOString(),
                    cnpj: viewDetail.cnpj,
                    enriched_data: {
                      CNPJ: viewDetail.cnpj, RazaoSocial: viewDetail.razao_social, NomeFantasia: viewDetail.nome_fantasia,
                      Porte: porteLabel(viewDetail.porte), CapitalSocial: viewDetail.capital_social,
                      AtividadePrincipal: viewDetail.cnae_fiscal_descricao, CNAEFiscal: viewDetail.cnae_fiscal,
                      SituacaoCadastral: situacaoLabel(viewDetail.situacao_cadastral),
                      EnderecoCompleto: viewDetail.endereco, Bairro: viewDetail.bairro, CEP: viewDetail.cep,
                      UF: viewDetail.uf, Municipio: viewDetail.municipio, Telefone1: viewDetail.telefone_1,
                      Email: viewDetail.email, OpcaoSimples: viewDetail.opcao_simples, OpcaoMEI: viewDetail.opcao_mei,
                    }
                  }
                  onAddToBase(lead)
                  showToast(`${viewDetail.nome_fantasia || viewDetail.razao_social} adicionada!`, 'success')
                  setViewDetail(null)
                }} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Plus size={14} /> Adicionar na Base
                </button>
                <button onClick={() => setViewDetail(null)} className="btn-ghost text-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ emoji, label, value }: { emoji: string; label: string; value: any }) {
  if (!value || value === '' || value === null || value === undefined) return null
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-sm mt-0.5 shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className="text-sm text-slate-200 break-words">{value}</p>
      </div>
    </div>
  )
}
