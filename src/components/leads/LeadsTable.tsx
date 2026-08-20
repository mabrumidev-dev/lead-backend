import { useMemo, useState, useCallback } from 'react'
import { Lead } from '@/types/lead'
import { 
  Heart, 
  ArrowDownUp, 
  ShieldCheck, 
  XCircle,
  Users,
  Phone,
  Shield,
  Target,
  Palette,
  Eye,
  Info,
  CheckCircle,
  Search,
  Download,
} from 'lucide-react'
import { LinkedInIcon, InstagramIcon, FacebookIcon, XIcon } from '@/components/SocialIcons'

interface LeadsTableProps {
  leads: any[]
  loading: boolean
  error: string | null
  refetch: () => void
  onAddToBase?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
  onDeleteMultiple?: (ids: string[]) => void
  baseLeadIds?: string[]
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  loading,
  error,
  refetch,
  onAddToBase,
  onDelete,
  onDeleteMultiple,
  baseLeadIds = []
}) => {
  const [search, setSearch] = useState('')
  const [viewLead, setViewLead] = useState<any>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads
    const term = search.toLowerCase()
    return leads.filter((lead: any) => {
      const name = (lead.name || lead.nome || '').toLowerCase()
      const phone = (lead.phone || lead.telefone || '').toLowerCase()
      const city = (lead.city || lead.cidade || '').toLowerCase()
      return name.includes(term) || phone.includes(term) || city.includes(term)
    })
  }, [leads, search])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredLeads.map((l: any) => l.id)))
    }
  }

  const selectedLeads = useMemo(
    () => filteredLeads.filter((l: any) => selected.has(l.id)),
    [filteredLeads, selected]
  )

  const transformedLeads = filteredLeads.map((lead) => ({
    ...lead,
    ageDisplay: (lead.age || lead.idade) ? `${lead.age || lead.idade} anos` : 'Não informado',
    scoreDisplay: lead.score ? `${lead.score}%` : 'N/A',
    statusColor: {
      new: 'text-red-400',
      contacted: 'text-yellow-400',
      qualified: 'text-green-400'
    }[lead.status as 'new' | 'contacted' | 'qualified'] || 'text-slate-400',
    leadName: lead.name || lead.nome || 'Lead sem nome',
    leadEmail: lead.email || (lead.endereco ? `/${lead.endereco.substring(0, 20)}` : 'N/A'),
    leadPhone: lead.phone || lead.telefone || '(00) 0000-0000',
    leadPlan: lead.plan || lead.nicho || 'Não informado',
    leadCity: lead.city || lead.cidade || '',
  }))

  if (loading) {
    return (
      <div className="h-64 bg-slate-900/50 rounded-xl flex items-center justify-center">
        <span className="text-slate-500">Carregando leads...</span>
      </div>
    )
  }

  if (error && leads.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">Erro: {error}</p>
        <button onClick={refetch} className="mt-2 text-cyan-400 hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-lg">Nenhum lead encontrado.</p>
        <p className="text-slate-500 mt-2">Os leads do seu Supabase devem aparecer abaixo.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          ⚠️ {error}
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white text-sm">
            Limpar
          </button>
        )}
        <span className="text-xs text-slate-500">{filteredLeads.length} de {leads.length}</span>
        <button
          onClick={() => {
            const headers = ['Nome','Telefone','Cidade','Plano','Score','Status']
            const rows = filteredLeads.map((l: any) => [
              l.name || l.nome || '',
              l.phone || l.telefone || '',
              l.city || l.cidade || '',
              l.plan || l.nicho || '',
              String(l.score || ''),
              l.status || 'new'
            ])
            const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `leads_mabrumi_${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 transition"
          title="Exportar CSV"
        >
          <Download size={16} />
        </button>
      </div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-sm text-cyan-400 font-medium">{selected.size} selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => {
                const csv = selectedLeads.map((l: any) => [
                  l.name || l.nome || '', l.phone || l.telefone || '', l.city || l.cidade || '',
                  l.plan || l.nicho || '', String(l.score || ''), l.status || 'new'
                ])
                const headers = ['Nome','Telefone','Cidade','Plano','Score','Status']
                const file = [headers, ...csv].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                const blob = new Blob([file], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url
                a.download = `leads_selecionados_${new Date().toISOString().split('T')[0]}.csv`
                a.click(); URL.revokeObjectURL(url)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-xs font-medium"
            ><Download size={13} /> CSV</button>
            <button
              onClick={() => {
                if (confirm(`Excluir ${selected.size} lead(s) selecionados?`)) {
                  onDeleteMultiple?.(Array.from(selected))
                  setSelected(new Set())
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 transition-colors text-xs font-medium"
            ><XCircle size={13} /> Excluir</button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-colors text-xs"
            >Limpar</button>
          </div>
        </div>
      )}
      <table className="w-full min-w-table">
        <thead className="border-b border-slate-800/50">
          <tr className="text-slate-400 text-xs uppercase">
            <th className="py-3 px-3 w-10">
              <input
                type="checkbox"
                checked={filteredLeads.length > 0 && selected.size === filteredLeads.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4 text-left">Lead</th>
            <th className="py-3 px-4 text-left">Contato</th>
            <th className="py-3 px-4 text-left">Idade</th>
            <th className="py-3 px-4 text-left">Plano/Nicho</th>
            <th className="py-3 px-4 text-left">Score</th>
            <th className="py-3 px-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {transformedLeads.map((lead) => (
            <tr key={lead.id} className={`hover:bg-slate-900/30 transition-colors ${selected.has(lead.id) ? 'bg-cyan-500/5' : ''}`}>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={selected.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                />
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-white">{lead.leadName || lead.nome || 'Lead'}</p>
                  <p className="text-xs text-slate-500">{lead.leadEmail || 'Sem email'}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">📞</span>
                  <a href={`tel:${lead.leadPhone || '000000000'}`} className="text-cyan-400 hover:underline text-sm">
                    {lead.leadPhone || '000000000'}
                  </a>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`text-slate-400 font-medium ${lead.ageDisplay}`}>
                  {lead.ageDisplay}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs ${lead.leadPlan === 'restaurante' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {lead.leadPlan || lead.nicho || 'Não informado'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`text-${lead.score >= 75 ? 'green' : lead.score >= 50 ? 'yellow' : 'red'}-400 font-medium`}>
                  {lead.scoreDisplay}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setViewLead(lead)}
                    title="Ver detalhes"
                    className="p-1 rounded bg-slate-800/50 hover:bg-cyan-500/20 transition-colors text-cyan-400"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={refetch}
                    title="Atualizar"
                    className="p-1 rounded hover:bg-slate-800/50 transition-colors"
                  >
                    <ArrowDownUp size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (!baseLeadIds.includes(lead.id)) {
                        onAddToBase?.(lead)
                      }
                    }}
                    title={baseLeadIds.includes(lead.id) ? 'Já está na base' : 'Adicionar base'}
                    className={`p-1 rounded transition-colors ${baseLeadIds.includes(lead.id) ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'}`}
                  >
                    <ShieldCheck size={14} />
                  </button>
                  <button
                    onClick={() => onDelete?.(lead.id)}
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

      {viewLead && (() => {
        const phoneKey = (viewLead.phone || viewLead.telefone || '').replace(/\D/g, '')
        const enriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')[phoneKey] || null
        const fmtCNPJ = (v: string) => {
          if (!v) return null
          const d = v.replace(/\D/g, '')
          if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
          return v
        }
        const fmtCurrency = (v: any) => {
          if (v === null || v === undefined || v === '') return null
          return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewLead(null)}>
            <div className="relative w-full max-w-5xl rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewLead(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
                <XCircle size={18} />
              </button>
              <div className="p-5 max-h-[85vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{viewLead.name || viewLead.nome || 'Lead'}</h2>
                <p className="text-xs text-slate-500 mb-4">Dados do lead</p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Telefone</p><p className="text-sm text-slate-200">📞 {viewLead.phone || viewLead.telefone || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Email</p><p className="text-sm text-slate-200">✉️ {enriched?.Email || viewLead.email || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Cidade</p><p className="text-sm text-slate-200">📍 {viewLead.city || viewLead.cidade || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Idade</p><p className="text-sm text-slate-200">👤 {viewLead.age || viewLead.idade ? `${viewLead.age || viewLead.idade} anos` : 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Plano/Nicho</p><p className="text-sm text-slate-200">🏷️ {viewLead.plan || viewLead.nicho || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Score</p><p className="text-sm text-slate-200">⭐ {viewLead.score ? `${viewLead.score}%` : 'N/A'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Fonte</p><p className="text-sm text-slate-200">📥 {viewLead.source || viewLead.fonte || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Criado em</p><p className="text-sm text-slate-200">📅 {viewLead.created_at ? new Date(viewLead.created_at).toLocaleDateString('pt-BR') : 'Não informado'}</p></div>
                </div>

                {enriched && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏢</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dados Empresariais</h3>
                      {enriched.SituacaoCadastral && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          enriched.SituacaoCadastral === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>{enriched.SituacaoCadastral}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {enriched.CNPJ && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">CNPJ</p><p className="text-sm text-slate-200">📋 {fmtCNPJ(enriched.CNPJ)}</p></div>}
                      {enriched.RazaoSocial && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Razão Social</p><p className="text-sm text-slate-200">{enriched.RazaoSocial}</p></div>}
                      {enriched.NomeFantasia && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Nome Fantasia</p><p className="text-sm text-slate-200">{enriched.NomeFantasia}</p></div>}
                      {enriched.NaturezaJuridica && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Natureza Jurídica</p><p className="text-sm text-slate-200">{enriched.NaturezaJuridica}</p></div>}
                      {enriched.Porte && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Porte</p><p className="text-sm text-slate-200">{enriched.Porte}</p></div>}
                      {fmtCurrency(enriched.CapitalSocial) && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Capital Social</p><p className="text-sm text-slate-200">{fmtCurrency(enriched.CapitalSocial)}</p></div>}
                      {enriched.AtividadePrincipal && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Atividade Principal</p><p className="text-sm text-slate-200">{enriched.AtividadePrincipal}</p></div>}
                      {enriched.IdentificadorMatrizFilial && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Tipo</p><p className="text-sm text-slate-200">{enriched.IdentificadorMatrizFilial}</p></div>}
                      {enriched.DataInicioAtividade && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Início Atividade</p><p className="text-sm text-slate-200">{enriched.DataInicioAtividade}</p></div>}
                      {enriched.EnderecoCompleto && <div className="py-1.5 col-span-2"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Endereço Completo</p><p className="text-sm text-slate-200">📍 {enriched.EnderecoCompleto}</p></div>}
                      {enriched.CEP && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">CEP</p><p className="text-sm text-slate-200">{enriched.CEP}</p></div>}
                      {enriched.UF && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">UF</p><p className="text-sm text-slate-200">{enriched.UF}</p></div>}
                    </div>

                    {enriched.Responsavel && (
                      <>
                        <div className="border-t border-slate-700 my-4" />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">👤</span>
                          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Responsável</h3>
                        </div>
                        <p className="text-sm text-slate-200 ml-8">{enriched.Responsavel}</p>
                      </>
                    )}

                    {enriched.QSA && enriched.QSA.length > 0 && (
                      <>
                        <div className="border-t border-slate-700 my-4" />
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">👥</span>
                          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Quadro Societário ({enriched.QSA.length})</h3>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead><tr className="border-b border-slate-700">
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Nome</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Qualificação</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Rep. Legal</th>
                            </tr></thead>
                            <tbody>{enriched.QSA.map((q: any, i: number) => (
                              <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                                <td className="px-3 py-2 text-slate-200 font-medium">{q.nome}</td>
                                <td className="px-3 py-2 text-slate-300">{q.qualificacao}</td>
                                <td className="px-3 py-2 text-slate-300">{q.entrada}</td>
                                <td className="px-3 py-2 text-slate-300">{q.representante_legal || '-'}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0 && (
                      <>
                        <div className="border-t border-slate-700 my-4" />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">🏭</span>
                          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">CNAEs Secundários ({enriched.CnaesSecundarios.length})</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">{enriched.CnaesSecundarios.map((c: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[11px] border border-slate-600/30">{c}</span>
                        ))}</div>
                      </>
                    )}

                    {enriched.RegimeTributario && enriched.RegimeTributario.length > 0 && (
                      <>
                        <div className="border-t border-slate-700 my-4" />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">💰</span>
                          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Regime Tributário</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">{enriched.RegimeTributario.map((r: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">{r}</span>
                        ))}</div>
                      </>
                    )}

                    {enriched.SocialMedia && Object.keys(enriched.SocialMedia).length > 0 && (() => {
                      const SOCIAL_ICONS: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
                        'LinkedIn': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', icon: <LinkedInIcon size={20} className="text-blue-400" /> },
                        'Instagram': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25', icon: <InstagramIcon size={20} className="text-pink-400" /> },
                        'Facebook': { color: 'text-blue-500', bg: 'bg-blue-600/10', border: 'border-blue-600/25', icon: <FacebookIcon size={20} className="text-blue-500" /> },
                        'Twitter/X': { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', icon: <XIcon size={20} className="text-sky-400" /> },
                      }
                      const found = Object.entries(enriched.SocialMedia).filter(([, v]: [string, any]) => v?.url && !v?.not_found)
                      const notFound = Object.entries(enriched.SocialMedia).filter(([, v]: [string, any]) => v?.not_found)
                      if (found.length === 0 && notFound.length === 0) return null
                      return (
                        <>
                          <div className="border-t border-slate-700 my-4" />
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">🔗</span>
                            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
                            {found.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">{found.length} perfil(is)</span>
                            )}
                          </div>
                          {found.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {found.map(([platform, data]: [string, any]) => {
                                const style = SOCIAL_ICONS[platform] || { color: 'text-slate-400', bg: 'bg-slate-700/10', border: 'border-slate-600/25', icon: '🔗' }
                                return (
                                  <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} hover:brightness-125 transition-all group`}>
                                    <span className="text-2xl">{style.icon}</span>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-bold ${style.color} uppercase tracking-wider`}>{platform}</p>
                                      <p className="text-[11px] text-slate-400 truncate group-hover:text-slate-300">{data.title || data.url}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-500 shrink-0">↗</span>
                                  </a>
                                )
                              })}
                            </div>
                          )}
                          {notFound.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {notFound.map(([platform]: [string, any]) => {
                                const style = SOCIAL_ICONS[platform] || { color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/30', icon: '🔗' }
                                return (
                                  <span key={platform} className={`px-2 py-1 rounded-lg ${style.bg} border ${style.border} text-[10px] text-slate-500`}>{style.icon} {platform} — não encontrado</span>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {enriched.Website && (
                      <>
                        <div className="border-t border-slate-700 my-4" />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">🌐</span>
                          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Google Maps</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {enriched.Address && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Endereço Maps</p><p className="text-sm text-slate-200">{enriched.Address}</p></div>}
                          <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Avaliação</p><p className="text-sm text-slate-200">⭐ {enriched.Rating || 'N/A'} ({enriched['Total Reviews'] || 0} reviews)</p></div>
                          <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Site</p>
                            <a href={enriched.Website} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all">{enriched.Website}</a>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {!enriched && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-center">
                    <p className="text-slate-500 text-xs">Dados enriquecidos não disponíveis. Importe este lead pelo Google Maps Scraper após enriquecer com "Buscar Responsável".</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}