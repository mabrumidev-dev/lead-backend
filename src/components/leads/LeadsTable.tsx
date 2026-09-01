import { useMemo, useState } from 'react'
import { Lead } from '@/types/lead'
import { Search, Download, Eye, ShieldCheck, XCircle, ArrowDownUp, ChevronDown, Filter } from 'lucide-react'

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
    const headers = ['Nome','Telefone','Cidade','Plano','Score','Status']
    const rows = filteredLeads.map((l: any) => [
      l.name || l.nome || '', l.phone || l.telefone || '', l.city || l.cidade || '',
      l.plan || l.nicho || '', String(l.score || ''), l.status || 'new'
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
      {viewLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in" onClick={() => setViewLead(null)}>
          <div className="glass w-full max-w-2xl mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400">
                    {(viewLead.name || viewLead.nome || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{viewLead.name || viewLead.nome || 'Lead'}</h2>
                    <p className="text-xs text-slate-500">{viewLead.source || viewLead.fonte || 'Desconhecido'}</p>
                  </div>
                </div>
                <button onClick={() => setViewLead(null)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <XCircle size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Telefone', value: viewLead.phone || viewLead.telefone },
                  { label: 'Email', value: viewLead.email },
                  { label: 'Cidade', value: viewLead.city || viewLead.cidade },
                  { label: 'Plano', value: viewLead.plan || viewLead.nicho },
                  { label: 'Score', value: viewLead.score ? `${viewLead.score}%` : null },
                  { label: 'Status', value: viewLead.status },
                  { label: 'Criado em', value: viewLead.created_at ? new Date(viewLead.created_at).toLocaleDateString('pt-BR') : null },
                ].filter(f => f.value).map(field => (
                  <div key={field.label} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{field.label}</p>
                    <p className="text-sm text-white">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
