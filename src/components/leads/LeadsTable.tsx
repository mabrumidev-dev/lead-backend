import { useMemo, useState } from 'react'
import { Lead } from '@/types/lead'
import { Search, Download, Eye, ShieldCheck, XCircle, ArrowDownUp, ChevronDown, Filter, FileText, FileSpreadsheet, Printer } from 'lucide-react'

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
  leads, loading, error, refetch, onAddToBase, onDelete, onDeleteMultiple, baseLeadIds = []
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
    if (selected.size === filteredLeads.length) setSelected(new Set())
    else setSelected(new Set(filteredLeads.map((l: any) => l.id)))
  }

  const exportCSV = () => {
    const headers = ['Nome','Telefone','Cidade','Plano','Score','Status','CNPJ','Responsavel','Razao Social','Nome Fantasia','Website','Porte','Atividade Principal','QSA','Redes Sociais']
    const rows = filteredLeads.map((l: any) => {
      const ed = l.enriched_data || {}
      const qsa = Array.isArray(ed.QSA) ? ed.QSA.map((s: any) => s.nome || s.Nome || '').join('; ') : ''
      const social = ed.SocialMedia ? Object.entries(ed.SocialMedia).filter(([, v]: any) => v?.url).map(([k]) => k).join('; ') : ''
      return [
        l.name || l.nome || '', l.phone || l.telefone || '', l.city || l.cidade || '',
        l.plan || l.nicho || '', String(l.score || ''), l.status || 'new',
        ed.CNPJ || l.cnpj || '', ed.Responsavel || l.responsavel || '', ed.RazaoSocial || '',
        ed.NomeFantasia || '', ed.Website || l.website || '', ed.Porte || '',
        ed.AtividadePrincipal || '', qsa, social
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `leads_mabrumi_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="glass p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando leads...</p>
        </div>
      </div>
    )
  }

  if (error && leads.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <XCircle size={28} className="text-rose-400" />
        </div>
        <p className="text-rose-400 font-medium mb-2">Erro ao carregar</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={refetch} className="btn-ghost">Tentar novamente</button>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4">
          <Search size={32} className="text-slate-600" />
        </div>
        <p className="text-lg text-slate-400 mb-2">Nenhum lead encontrado</p>
        <p className="text-sm text-slate-600">Use os filtros acima ou importe leads via CSV</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Warning */}
      {error && (
        <div className="glass-sm p-3 border-amber-500/20 flex items-center gap-3 text-amber-400 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field input-field-with-icon"
          />
        </div>
        <div className="flex items-center gap-2">
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost text-xs px-3 py-2">
              Limpar
            </button>
          )}
          <span className="text-xs text-slate-500 px-2">{filteredLeads.length} de {leads.length}</span>
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 px-3 py-2">
            <Download size={14} />
            <span className="text-xs">CSV</span>
          </button>
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="glass-sm p-3 border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-scale-in">
          <span className="text-sm text-cyan-400 font-medium">{selected.size} selecionado(s)</span>
          <div className="flex gap-2 sm:ml-auto">
            <button onClick={() => {
              const csv = filteredLeads.filter((l: any) => selected.has(l.id)).map((l: any) => [
                l.name || '', l.phone || '', l.city || '', l.plan || '', String(l.score || ''), l.status || ''
              ])
              const headers = ['Nome','Telefone','Cidade','Plano','Score','Status']
              const file = [headers, ...csv].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
              const blob = new Blob([file], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url
              a.download = `leads_selecionados.csv`; a.click(); URL.revokeObjectURL(url)
            }} className="btn-success text-xs flex items-center gap-1.5">
              <Download size={13} /> Exportar
            </button>
            <button onClick={() => {
              if (confirm(`Excluir ${selected.size} lead(s)?`)) {
                onDeleteMultiple?.(Array.from(selected))
                setSelected(new Set())
              }
            }} className="btn-danger text-xs flex items-center gap-1.5">
              <XCircle size={13} /> Excluir
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs">
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input type="checkbox" checked={filteredLeads.length > 0 && selected.size === filteredLeads.length} onChange={toggleSelectAll} />
                </th>
                <th>Lead</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>Plano</th>
                <th>Score</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead: any) => {
                const isSelected = selected.has(lead.id)
                const isBase = baseLeadIds.includes(lead.id)
                const name = lead.name || lead.nome || 'Lead sem nome'
                const phone = lead.phone || lead.telefone || ''
                const city = lead.city || lead.cidade || ''
                const plan = lead.plan || lead.nicho || 'Individual'
                const score = lead.score || 0

                return (
                  <tr key={lead.id} className={isSelected ? 'selected' : ''}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/15 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                          {name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-[13px]">{name}</p>
                          <p className="text-[11px] text-slate-500">{lead.email || 'Sem email'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {phone ? (
                        <a href={`tel:${phone}`} className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                          {phone}
                        </a>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-slate-300">{city || '—'}</span>
                    </td>
                    <td>
                      <span className={`badge ${plan === 'Empresarial' ? 'badge-blue' : plan === 'Grupo' ? 'badge-amber' : 'badge-cyan'}`}>
                        {plan}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {score}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewLead(lead)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all" title="Ver detalhes">
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => !isBase && onAddToBase?.(lead)}
                          className={`p-1.5 rounded-lg transition-all ${isBase ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400'}`}
                          title={isBase ? 'Já na base' : 'Adicionar à base'}
                        >
                          <ShieldCheck size={15} />
                        </button>
                        <button onClick={() => onDelete?.(lead.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all" title="Excluir">
                          <XCircle size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {viewLead && (() => {
        const enriched = viewLead.enriched_data || {}
        const social = enriched.SocialMedia || {}
        const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)

        const downloadCSV = () => {
          const h = ['Nome','Telefone','Email','Cidade','CNPJ','Razão Social','Nome Fantasia','Responsável','Porte','Atividade Principal','Website','Situação','Capital Social','Natureza Jurídica','CEP','UF','Município','Bairro','Endereço','Telefone 1','Telefone 2','CNAE Fiscal','Simples','MEI','QSA','Redes Sociais']
          const qsa = (enriched.QSA || []).map((s: any) => `${s.nome} (${s.qualificacao})`).join('; ')
          const socialStr = socialEntries.map(([k, v]: any) => `${k}: ${v.url}`).join('; ')
          const v = [viewLead.name || '', viewLead.phone || '', viewLead.email || '', viewLead.city || '', enriched.CNPJ || '', enriched.RazaoSocial || '', enriched.NomeFantasia || '', enriched.Responsavel || '', enriched.Porte || '', enriched.AtividadePrincipal || '', enriched.Website || '', enriched.SituacaoCadastral || '', enriched.CapitalSocial || '', enriched.NaturezaJuridica || '', enriched.CEP || '', enriched.UF || '', enriched.Municipio || '', enriched.Bairro || '', enriched.EnderecoCompleto || '', enriched.Telefone1 || '', enriched.Telefone2 || '', enriched.CNAEFiscal || '', String(enriched.OpcaoSimples ?? ''), String(enriched.OpcaoMEI ?? ''), qsa, socialStr]
          const csv = [h.join(','), v.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')].join('\n')
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = `lead-${(viewLead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url)
        }

        const downloadTXT = () => {
          const sep = '═'.repeat(56)
          const line = '─'.repeat(56)
          let txt = `\n${sep}\n  DADOS DO LEAD\n${sep}\n\n`
          txt += `Nome: ${viewLead.name}\nTelefone: ${viewLead.phone || 'N/A'}\nEmail: ${viewLead.email || 'N/A'}\nCidade: ${viewLead.city || 'N/A'}\n`
          if (enriched.CNPJ) {
            txt += `\n📋 DADOS EMPRESARIAIS\n${line}\n`
            txt += `CNPJ: ${enriched.CNPJ}\nRazão Social: ${enriched.RazaoSocial || 'N/A'}\nNome Fantasia: ${enriched.NomeFantasia || 'N/A'}\nResponsável: ${enriched.Responsavel || 'N/A'}\nPorte: ${enriched.Porte || 'N/A'}\nAtividade: ${enriched.AtividadePrincipal || 'N/A'}\nSituação: ${enriched.SituacaoCadastral || 'N/A'}\n`
          }
          if (socialEntries.length > 0) {
            txt += `\n🔗 REDES SOCIAIS\n${line}\n`
            for (const [p, d] of socialEntries) txt += `${p}: ${d.url}\n`
          }
          txt += `\n${sep}\n`
          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = `lead-${(viewLead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.txt`; a.click(); URL.revokeObjectURL(url)
        }

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in" onClick={() => setViewLead(null)}>
            <div className="relative w-full max-w-3xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewLead(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
                <XCircle size={18} />
              </button>

              <div className="p-5 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 pr-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400">
                    {(viewLead.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{viewLead.name || 'Lead'}</h2>
                    <p className="text-xs text-slate-500">{viewLead.source || viewLead.fonte || 'CRM'}</p>
                  </div>
                </div>

                {/* Grid de dados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    { e: '📞', l: 'Telefone', v: viewLead.phone || viewLead.telefone },
                    { e: '✉️', l: 'Email', v: viewLead.email },
                    { e: '📍', l: 'Cidade', v: viewLead.city || viewLead.cidade },
                    { e: '📊', l: 'Plano', v: viewLead.plan || viewLead.nicho },
                    { e: '⭐', l: 'Score', v: viewLead.score ? `${viewLead.score}%` : null },
                    { e: '🏷️', l: 'Status', v: viewLead.status === 'new' ? 'Novo' : viewLead.status === 'contacted' ? 'Contactado' : viewLead.status === 'qualified' ? 'Qualificado' : viewLead.status },
                    { e: '📅', l: 'Criado em', v: viewLead.created_at ? new Date(viewLead.created_at).toLocaleDateString('pt-BR') : null },
                  ].filter(f => f.v).map(f => (
                    <div key={f.l} className="flex items-start gap-2.5 py-1.5">
                      <span className="text-sm mt-0.5 shrink-0">{f.e}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{f.l}</p>
                        <p className="text-sm text-slate-200 break-words">{f.v}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dados Empresariais */}
                {enriched.CNPJ && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏢</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dados Empresariais</h3>
                      {enriched.SituacaoCadastral && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${enriched.SituacaoCadastral === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{enriched.SituacaoCadastral}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {[
                        { e: '📋', l: 'CNPJ', v: enriched.CNPJ },
                        { e: '📑', l: 'Razão Social', v: enriched.RazaoSocial },
                        { e: '🏷️', l: 'Nome Fantasia', v: enriched.NomeFantasia },
                        { e: '👤', l: 'Responsável', v: enriched.Responsavel },
                        { e: '🏛️', l: 'Natureza Jurídica', v: enriched.NaturezaJuridica },
                        { e: '📊', l: 'Porte', v: enriched.Porte },
                        { e: '💰', l: 'Capital Social', v: enriched.CapitalSocial ? `R$ ${Number(enriched.CapitalSocial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null },
                        { e: '⚙️', l: 'Atividade Principal', v: enriched.AtividadePrincipal },
                        { e: '🔢', l: 'CNAE Fiscal', v: enriched.CNAEFiscal ? String(enriched.CNAEFiscal) : null },
                        { e: '📅', l: 'Início Atividade', v: enriched.DataInicioAtividade },
                        { e: '🏷️', l: 'Tipo', v: enriched.IdentificadorMatrizFilial },
                        { e: '✅', l: 'Simples Nacional', v: enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : null },
                        { e: '🏠', l: 'MEI', v: enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : null },
                        { e: '🌐', l: 'Website', v: enriched.Website || viewLead.website },
                      ].filter(f => f.v).map(f => (
                        <div key={f.l} className="flex items-start gap-2.5 py-1.5">
                          <span className="text-sm mt-0.5 shrink-0">{f.e}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{f.l}</p>
                            {f.l === 'Website' && f.v ? (
                              <a href={f.v} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all">{f.v}</a>
                            ) : (
                              <p className="text-sm text-slate-200 break-words">{f.v}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Endereço */}
                {(enriched.EnderecoCompleto || enriched.CEP || enriched.Municipio) && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📍</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Endereço</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {[
                        { e: '🏠', l: 'Logradouro', v: enriched.EnderecoCompleto },
                        { e: '📮', l: 'CEP', v: enriched.CEP },
                        { e: '🗺️', l: 'UF', v: enriched.UF },
                        { e: '🏙️', l: 'Município', v: enriched.Municipio },
                        { e: '📍', l: 'Bairro', v: enriched.Bairro },
                      ].filter(f => f.v).map(f => (
                        <div key={f.l} className="flex items-start gap-2.5 py-1.5">
                          <span className="text-sm mt-0.5 shrink-0">{f.e}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{f.l}</p>
                            <p className="text-sm text-slate-200 break-words">{f.v}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Contato */}
                {(enriched.Telefone1 || enriched.Telefone2 || enriched.Email) && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📞</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contato</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {[
                        { e: '📱', l: 'Telefone 1', v: enriched.Telefone1 },
                        { e: '📱', l: 'Telefone 2', v: enriched.Telefone2 },
                        { e: '✉️', l: 'Email', v: enriched.Email },
                      ].filter(f => f.v).map(f => (
                        <div key={f.l} className="flex items-start gap-2.5 py-1.5">
                          <span className="text-sm mt-0.5 shrink-0">{f.e}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{f.l}</p>
                            <p className="text-sm text-slate-200 break-words">{f.v}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* QSA */}
                {enriched.QSA && enriched.QSA.length > 0 && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">👥</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Quadro Societário ({enriched.QSA.length})</h3>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Nome</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Qualificação</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">Faixa Etária</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enriched.QSA.map((s: any, i: number) => (
                              <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                                <td className="px-3 py-2 text-slate-200 font-medium">{s.nome || s.Nome || 'Sócio'}</td>
                                <td className="px-3 py-2 text-slate-300">{s.qualificacao || s.Qualificacao || ''}</td>
                                <td className="px-3 py-2 text-slate-300">{s.entrada || ''}</td>
                                <td className="px-3 py-2 text-slate-300">{s.faixa_etaria || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Regime Tributário */}
                {enriched.RegimeTributario && enriched.RegimeTributario.length > 0 && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">💰</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Regime Tributário</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enriched.RegimeTributario.map((r: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">{r}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* CNAEs Secundários */}
                {enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0 && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏭</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">CNAEs Secundários ({enriched.CnaesSecundarios.length})</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enriched.CnaesSecundarios.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[11px] border border-slate-600/30">{c}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Plano de Saúde */}
                {enriched.HealthPlan && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏥</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Plano de Saúde</h3>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${enriched.HealthPlan.tem_plano === true ? 'bg-emerald-500/10 border-emerald-500/25' : enriched.HealthPlan.tem_plano === null ? 'bg-amber-500/10 border-amber-500/25' : 'bg-slate-500/10 border-slate-500/25'}`}>
                      <span className="text-xl">{enriched.HealthPlan.tem_plano === true ? '🏥' : enriched.HealthPlan.tem_plano === null ? '❓' : '⬜'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${enriched.HealthPlan.tem_plano === true ? 'text-emerald-400' : enriched.HealthPlan.tem_plano === null ? 'text-amber-400' : 'text-slate-400'}`}>
                          {enriched.HealthPlan.tem_plano === true ? 'Plano de Saúde Identificado' : enriched.HealthPlan.tem_plano === null ? 'Verificação Inconclusiva' : 'Plano Não Identificado'}
                        </p>
                        <p className="text-[11px] text-slate-400">Tipo: {enriched.HealthPlan.tipo || '-'} | Confiança: {enriched.HealthPlan.confianca || '-'}</p>
                        {enriched.HealthPlan.sinais && enriched.HealthPlan.sinais.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {enriched.HealthPlan.sinais.map((s: string, i: number) => <p key={i} className="text-[10px] text-slate-500">• {s}</p>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Colaboradores */}
                {enriched.EmployeeCount && enriched.EmployeeCount.fonte && (
                  <>
                    <div className="border-t border-slate-700 my-4" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">👥</span>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Colaboradores</h3>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${enriched.EmployeeCount.funcionarios !== null ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-sky-500/10 border-sky-500/25'}`}>
                      <span className="text-xl">{enriched.EmployeeCount.funcionarios !== null ? '👥' : '📊'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${enriched.EmployeeCount.funcionarios !== null ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {enriched.EmployeeCount.funcionarios !== null ? `${enriched.EmployeeCount.funcionarios.toLocaleString('pt-BR')} colaboradores` : `Faixa estimada: ${enriched.EmployeeCount.faixa || '-'} colaboradores`}
                        </p>
                        <p className="text-[11px] text-slate-400">Fonte: {enriched.EmployeeCount.fonte} | Confiança: {enriched.EmployeeCount.confianca || '-'}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Redes Sociais */}
                <div className="border-t border-slate-700 my-4" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔗</span>
                  <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
                  {socialEntries.length > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">{socialEntries.length} perfil(is)</span>}
                </div>
                {socialEntries.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {socialEntries.map(([platform, data]: [string, any]) => (
                      <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 hover:brightness-125 transition-all">
                        <span className="text-lg">🔗</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{platform}</p>
                          <p className="text-[11px] text-slate-400 truncate">{data.title || data.url}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">↗</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhuma rede social encontrada</p>
                )}

                {/* Export */}
                <div className="border-t border-slate-700 mt-4 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Download size={14} className="text-slate-500" />
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Exportar</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-xs font-medium">
                      <FileSpreadsheet size={14} /> CSV
                    </button>
                    <button onClick={downloadTXT} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 transition-colors text-xs font-medium">
                      <FileText size={14} /> TXT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
