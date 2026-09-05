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
              const leadsToAdd = filteredLeads.filter((l: any) => selected.has(l.id) && !baseLeadIds.includes(l.id))
              if (leadsToAdd.length === 0) { alert('Todos já estão na base'); return }
              if (confirm(`Adicionar ${leadsToAdd.length} lead(s) na base?`)) {
                leadsToAdd.forEach((l: any) => onAddToBase?.(l))
                setSelected(new Set())
              }
            }} className="btn-success text-xs flex items-center gap-1.5">
              <ShieldCheck size={13} /> Adicionar na Base
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

      {/* Detail Modal — formato limpo igual ao print */}
      {viewLead && <LeadDetailModal lead={viewLead} onClose={() => setViewLead(null)} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Modal de detalhes — formato com emojis (igual LeadDetailPopup)
   ═══════════════════════════════════════════════════════ */
function LeadDetailModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const enriched = lead.enriched_data || {}
  const social = enriched.SocialMedia || {}
  const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)

  const fmt = (v: any) => v ?? 'Não informado'
  const fmtCNPJ = (v: string) => {
    if (!v) return ''
    const d = v.replace(/\D/g, '')
    if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    return v
  }
  const fmtCurrency = (v: any) => {
    if (v === null || v === undefined || v === '') return ''
    return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const hasCNPJ = !!enriched.CNPJ

  // ── Export functions ──
  const downloadCSV = () => {
    const h = ['Nome','Telefone','Email','Cidade','CNPJ','Razão Social','Nome Fantasia','Responsável','Porte','Atividade Principal','Website','Situação','Capital Social','Natureza Jurídica','CEP','UF','Município','Bairro','Endereço','Telefone 1','Telefone 2','CNAE Fiscal','Simples','MEI','QSA','Redes Sociais']
    const qsa = (enriched.QSA || []).map((s: any) => `${s.nome} (${s.qualificacao})`).join('; ')
    const socialStr = socialEntries.map(([k, v]: any) => `${k}: ${v.url}`).join('; ')
    const v = [lead.name || '', lead.phone || '', lead.email || '', lead.city || '', enriched.CNPJ || '', enriched.RazaoSocial || '', enriched.NomeFantasia || '', enriched.Responsavel || '', enriched.Porte || '', enriched.AtividadePrincipal || '', enriched.Website || '', enriched.SituacaoCadastral || '', enriched.CapitalSocial || '', enriched.NaturezaJuridica || '', enriched.CEP || '', enriched.UF || '', enriched.Municipio || '', enriched.Bairro || '', enriched.EnderecoCompleto || '', enriched.Telefone1 || '', enriched.Telefone2 || '', enriched.CNAEFiscal || '', String(enriched.OpcaoSimples ?? ''), String(enriched.OpcaoMEI ?? ''), qsa, socialStr]
    const csv = [h.join(','), v.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `lead-${(lead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const downloadTXT = () => {
    const sep = '═'.repeat(56)
    const line = '─'.repeat(56)
    let txt = `\n${sep}\n  DADOS DO LEAD\n${sep}\n\n`
    txt += `📋 GOOGLE MAPS\n${line}\n`
    txt += `  Nome:        ${lead.name}\n`
    txt += `  Telefone:    ${lead.phone || 'N/A'}\n`
    txt += `  Email:       ${lead.email || 'N/A'}\n`
    txt += `  Cidade:      ${lead.city || 'N/A'}\n`
    txt += `  Score:       ${lead.score || 0}%\n`
    txt += `  Status:      ${lead.status}\n`
    if (hasCNPJ) {
      txt += `\n📋 DADOS EMPRESARIAIS\n${line}\n`
      txt += `  CNPJ:              ${fmtCNPJ(enriched.CNPJ)}\n`
      txt += `  Razão Social:      ${enriched.RazaoSocial || 'N/A'}\n`
      txt += `  Nome Fantasia:     ${enriched.NomeFantasia || 'N/A'}\n`
      txt += `  Responsável:       ${enriched.Responsavel || 'N/A'}\n`
      txt += `  Porte:             ${enriched.Porte || 'N/A'}\n`
      txt += `  Atividade:         ${enriched.AtividadePrincipal || 'N/A'}\n`
      txt += `  Situação:          ${enriched.SituacaoCadastral || 'N/A'}\n`
      txt += `  Capital Social:    ${fmtCurrency(enriched.CapitalSocial) || 'N/A'}\n`
      txt += `  Natureza Jurídica: ${enriched.NaturezaJuridica || 'N/A'}\n`
      txt += `  CNAE:              ${enriched.CNAEFiscal || 'N/A'}\n`
      txt += `  Simples:           ${enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : 'N/A'}\n`
      txt += `  MEI:               ${enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : 'N/A'}\n`
      txt += `  Website:           ${enriched.Website || lead.website || 'N/A'}\n`
      txt += `\n📍 ENDEREÇO\n${line}\n`
      txt += `  Endereço:  ${enriched.EnderecoCompleto || 'N/A'}\n`
      txt += `  CEP:       ${enriched.CEP || 'N/A'}\n`
      txt += `  UF:        ${enriched.UF || 'N/A'}\n`
      txt += `  Município: ${enriched.Municipio || 'N/A'}\n`
      txt += `  Bairro:    ${enriched.Bairro || 'N/A'}\n`
      txt += `\n📞 CONTATO\n${line}\n`
      txt += `  Tel 1:     ${enriched.Telefone1 || 'N/A'}\n`
      txt += `  Tel 2:     ${enriched.Telefone2 || 'N/A'}\n`
      txt += `  Email:     ${enriched.Email || 'N/A'}\n`
    }
    if (enriched.QSA && enriched.QSA.length > 0) {
      txt += `\n👥 QUADRO SOCIETÁRIO (${enriched.QSA.length})\n${line}\n`
      for (const s of enriched.QSA) txt += `  • ${s.nome || s.Nome} — ${s.qualificacao || ''}\n`
    }
    if (enriched.RegimeTributario && enriched.RegimeTributario.length > 0) {
      txt += `\n💰 REGIME TRIBUTÁRIO\n${line}\n`
      for (const r of enriched.RegimeTributario) txt += `  • ${r}\n`
    }
    if (enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0) {
      txt += `\n🏭 CNAEs SECUNDÁRIOS\n${line}\n`
      for (const c of enriched.CnaesSecundarios) txt += `  • ${c}\n`
    }
    if (enriched.HealthPlan) {
      txt += `\n🏥 PLANO DE SAÚDE\n${line}\n`
      txt += `  Identificado: ${enriched.HealthPlan.tem_plano === true ? 'Sim' : enriched.HealthPlan.tem_plano === false ? 'Não' : 'Inconclusivo'}\n`
      txt += `  Tipo: ${enriched.HealthPlan.tipo || 'N/A'}\n`
      txt += `  Confiança: ${enriched.HealthPlan.confianca || 'N/A'}\n`
    }
    if (enriched.EmployeeCount && enriched.EmployeeCount.fonte) {
      txt += `\n👥 COLABORADORES\n${line}\n`
      txt += `  Quantidade: ${(enriched.EmployeeCount.funcionarios ?? enriched.EmployeeCount.faixa) || 'N/A'}\n`
      txt += `  Fonte: ${enriched.EmployeeCount.fonte}\n`
      txt += `  Confiança: ${enriched.EmployeeCount.confianca || 'N/A'}\n`
    }
    if (socialEntries.length > 0) {
      txt += `\n🔗 REDES SOCIAIS\n${line}\n`
      for (const [p, d] of socialEntries) txt += `  • ${p}: ${d.url}\n`
    }
    txt += `\n${sep}\n  Mabrumi CRM Pro\n${sep}\n`
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `lead-${(lead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.txt`; a.click(); URL.revokeObjectURL(url)
  }

  const downloadPDF = () => {
    const qsaRows = (enriched.QSA || []).map((q: any) => `<tr><td>${q.nome || q.Nome || ''}</td><td>${q.qualificacao || ''}</td><td>${q.entrada || ''}</td><td>${q.faixa_etaria || ''}</td></tr>`).join('')
    const socialRows = socialEntries.map(([p, d]: any) => `<tr><td>${p}</td><td><a href="${d.url}">${d.url}</a></td></tr>`).join('')
    const regimeRows = (enriched.RegimeTributario || []).map((r: string) => `<li>${r}</li>`).join('')
    const cnaeRows = (enriched.CnaesSecundarios || []).map((c: string) => `<li>${c}</li>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${lead.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:auto;margin:10mm}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1e293b;background:#fff}
  h1{color:#0891b2;font-size:22px;border-bottom:3px solid #0891b2;padding-bottom:8px;margin-bottom:20px}
  h2{color:#0e7490;font-size:15px;margin:20px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;page-break-after:avoid}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
  .field{margin:4px 0}
  .label{font-weight:700;color:#475569;font-size:12px;display:inline}
  .value{font-size:13px;color:#0f172a;display:inline;margin-left:4px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0}
  th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:11px;border:1px solid #e2e8f0}
  td{padding:5px 8px;border:1px solid #e2e8f0;font-size:11px}
  ul{margin:4px 0 4px 18px;font-size:12px}li{margin:2px 0}
  .section{page-break-inside:avoid}
  .footer{margin-top:30px;text-align:center;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{body{padding:15px}}
</style></head><body>
<h1>${lead.name}</h1>

<div class="section">
<h2>📋 Dados Gerais</h2>
<div class="grid">
  <div class="field"><span class="label">📞 Telefone:</span><span class="value">${lead.phone || 'N/A'}</span></div>
  <div class="field"><span class="label">✉️ Email:</span><span class="value">${lead.email || 'N/A'}</span></div>
  <div class="field"><span class="label">📍 Cidade:</span><span class="value">${lead.city || 'N/A'}</span></div>
  <div class="field"><span class="label">📋 Plano:</span><span class="value">${lead.plan || 'N/A'}</span></div>
  <div class="field"><span class="label">📊 Score:</span><span class="value">${lead.score || 0}%</span></div>
  <div class="field"><span class="label">📋 Status:</span><span class="value">${lead.status}</span></div>
</div>
</div>

<div class="section">
<h2>🏢 Dados Empresariais</h2>
<div class="grid">
  <div class="field"><span class="label">📋 CNPJ:</span><span class="value">${fmtCNPJ(enriched.CNPJ) || 'N/A'}</span></div>
  <div class="field"><span class="label">📋 Situação:</span><span class="value">${enriched.SituacaoCadastral || 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">📑 Razão Social:</span><span class="value">${enriched.RazaoSocial || 'N/A'}</span></div>
  <div class="field"><span class="label">🏷️ Nome Fantasia:</span><span class="value">${enriched.NomeFantasia || 'N/A'}</span></div>
  <div class="field"><span class="label">👤 Responsável:</span><span class="value">${enriched.Responsavel || 'N/A'}</span></div>
  <div class="field"><span class="label">📊 Porte:</span><span class="value">${enriched.Porte || 'N/A'}</span></div>
  <div class="field"><span class="label">🏛️ Natureza Jurídica:</span><span class="value">${enriched.NaturezaJuridica || 'N/A'}</span></div>
  <div class="field"><span class="label">💰 Capital Social:</span><span class="value">${fmtCurrency(enriched.CapitalSocial) || 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">⚙️ Atividade Principal:</span><span class="value">${enriched.AtividadePrincipal || 'N/A'}</span></div>
  <div class="field"><span class="label">🔢 CNAE:</span><span class="value">${enriched.CNAEFiscal || 'N/A'}</span></div>
  <div class="field"><span class="label">🏷️ Tipo:</span><span class="value">${enriched.IdentificadorMatrizFilial || 'N/A'}</span></div>
  <div class="field"><span class="label">📅 Início Atividade:</span><span class="value">${enriched.DataInicioAtividade || 'N/A'}</span></div>
  <div class="field"><span class="label">✅ Simples Nacional:</span><span class="value">${enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : 'N/A'}</span></div>
  <div class="field"><span class="label">🏠 MEI:</span><span class="value">${enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">🌐 Website:</span><span class="value">${enriched.Website || lead.website || 'N/A'}</span></div>
</div>
</div>

<div class="section">
<h2>📍 Endereço</h2>
<div class="grid">
  <div class="field" style="grid-column:1/3"><span class="label">🏠 Logradouro:</span><span class="value">${enriched.EnderecoCompleto || 'N/A'}</span></div>
  <div class="field"><span class="label">📮 CEP:</span><span class="value">${enriched.CEP || 'N/A'}</span></div>
  <div class="field"><span class="label">🗺️ UF:</span><span class="value">${enriched.UF || 'N/A'}</span></div>
  <div class="field"><span class="label">🏙️ Município:</span><span class="value">${enriched.Municipio || 'N/A'}</span></div>
  <div class="field"><span class="label">📍 Bairro:</span><span class="value">${enriched.Bairro || 'N/A'}</span></div>
</div>
</div>

<div class="section">
<h2>📞 Contato</h2>
<div class="grid">
  <div class="field"><span class="label">📱 Telefone 1:</span><span class="value">${enriched.Telefone1 || 'N/A'}</span></div>
  <div class="field"><span class="label">📱 Telefone 2:</span><span class="value">${enriched.Telefone2 || 'N/A'}</span></div>
  <div class="field"><span class="label">✉️ Email:</span><span class="value">${enriched.Email || 'N/A'}</span></div>
</div>
</div>

${enriched.QSA && enriched.QSA.length > 0 ? `<div class="section"><h2>👥 Quadro Societário (${enriched.QSA.length})</h2><table><tr><th>Nome</th><th>Qualificação</th><th>Entrada</th><th>Faixa Etária</th></tr>${qsaRows}</table></div>` : ''}
${enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0 ? `<div class="section"><h2>🏭 CNAEs Secundários</h2><ul>${cnaeRows}</ul></div>` : ''}
${enriched.RegimeTributario && enriched.RegimeTributario.length > 0 ? `<div class="section"><h2>💰 Regime Tributário</h2><ul>${regimeRows}</ul></div>` : ''}
${enriched.HealthPlan ? `<div class="section"><h2>🏥 Plano de Saúde</h2><p><strong>${enriched.HealthPlan.tem_plano === true ? 'Identificado' : enriched.HealthPlan.tem_plano === null ? 'Inconclusivo' : 'Não Identificado'}</strong> — Tipo: ${enriched.HealthPlan.tipo || '-'} | Confiança: ${enriched.HealthPlan.confianca || '-'}</p></div>` : ''}
${enriched.EmployeeCount && enriched.EmployeeCount.fonte ? `<div class="section"><h2>👥 Colaboradores</h2><p><strong>${enriched.EmployeeCount.funcionarios !== null ? enriched.EmployeeCount.funcionarios + ' colaboradores' : 'Faixa: ' + (enriched.EmployeeCount.faixa || '-')}</strong> — Fonte: ${enriched.EmployeeCount.fonte} | Confiança: ${enriched.EmployeeCount.confianca || '-'}</p></div>` : ''}
${socialEntries.length > 0 ? `<div class="section"><h2>🔗 Redes Sociais</h2><table><tr><th>Plataforma</th><th>URL</th></tr>${socialRows}</table></div>` : ''}

<div class="footer">Mabrumi CRM Pro — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
  }

  // ── Render ──
  const Field = ({ emoji, label, value }: { emoji: string; label: string; value: any }) => {
    const text = value ?? 'Não informado'
    if (!text || text === 'Não informado' || text === '' || text === null || text === undefined) return null
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <span className="text-sm mt-0.5 shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
          {typeof text === 'string' && text.startsWith('http') ? (
            <a href={text} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all">{text}</a>
          ) : (
            <p className="text-sm text-slate-200 break-words">{text}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-5xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
          <XCircle size={18} />
        </button>

        <div className="p-5 max-h-[85vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{lead.name || 'Lead'}</h2>
          <p className="text-xs text-slate-500 mb-4">Dados do CRM</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Field emoji="📞" label="Telefone" value={lead.phone || lead.telefone} />
            <Field emoji="✉️" label="Email" value={lead.email || enriched.Email} />
            <Field emoji="📍" label="Cidade" value={lead.city || lead.cidade} />
            <Field emoji="📋" label="Plano" value={lead.plan || lead.nicho} />
            <Field emoji="📊" label="Score" value={lead.score ? `${lead.score}%` : null} />
            <Field emoji="📋" label="Status" value={lead.status === 'new' ? 'Novo' : lead.status === 'contacted' ? 'Contactado' : lead.status === 'qualified' ? 'Qualificado' : lead.status} />
          </div>

          {hasCNPJ && (
            <>
              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏢</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dados Empresariais</h3>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  enriched.SituacaoCadastral === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>{fmt(enriched.SituacaoCadastral)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📋" label="CNPJ" value={fmtCNPJ(enriched.CNPJ)} />
                <Field emoji="📑" label="Razão Social" value={enriched.RazaoSocial} />
                <Field emoji="🏷️" label="Nome Fantasia" value={enriched.NomeFantasia} />
                <Field emoji="👤" label="Responsável" value={enriched.Responsavel} />
                <Field emoji="🏛️" label="Natureza Jurídica" value={enriched.NaturezaJuridica} />
                <Field emoji="📊" label="Porte" value={enriched.Porte} />
                <Field emoji="💰" label="Capital Social" value={enriched.CapitalSocial ? fmtCurrency(enriched.CapitalSocial) : null} />
                <Field emoji="⚙️" label="Atividade Principal" value={enriched.AtividadePrincipal} />
                <Field emoji="🔢" label="CNAE Fiscal" value={enriched.CNAEFiscal ? String(enriched.CNAEFiscal) : null} />
                <Field emoji="📅" label="Início Atividade" value={enriched.DataInicioAtividade} />
                <Field emoji="🏷️" label="Tipo" value={enriched.IdentificadorMatrizFilial} />
                <Field emoji="✅" label="Simples Nacional" value={enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : null} />
                <Field emoji="🏠" label="MEI" value={enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : null} />
                <Field emoji="🌐" label="Website" value={enriched.Website || lead.website} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📍</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Endereço</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="🏠" label="Logradouro" value={enriched.EnderecoCompleto} />
                <Field emoji="📮" label="CEP" value={enriched.CEP} />
                <Field emoji="🗺️" label="UF" value={enriched.UF} />
                <Field emoji="🏙️" label="Município" value={enriched.Municipio} />
                <Field emoji="📍" label="Bairro" value={enriched.Bairro} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📞</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contato</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📱" label="Telefone 1" value={enriched.Telefone1} />
                <Field emoji="📱" label="Telefone 2" value={enriched.Telefone2} />
                <Field emoji="✉️" label="Email" value={enriched.Email} />
              </div>

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
                              <td className="px-3 py-2 text-slate-200 font-medium">{s.nome || s.Nome || ''}</td>
                              <td className="px-3 py-2 text-slate-300">{s.qualificacao || ''}</td>
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

              {enriched.HealthPlan && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🏥</span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Plano de Saúde</span>
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

              {enriched.EmployeeCount && enriched.EmployeeCount.fonte && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">👥</span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Colaboradores</span>
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
            </>
          )}

          {/* Redes Sociais */}
          {socialEntries.length > 0 && (
            <>
              <div className="border-t border-slate-700 my-4" />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔗</span>
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">
                  {socialEntries.length} perfil(is)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {socialEntries.map(([platform, data]: [string, any]) => (
                  <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:brightness-125 transition-all">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{platform}</span>
                    <span className="text-[11px] text-slate-400 truncate flex-1">{data.title || data.url}</span>
                    <span className="text-[10px] text-slate-500">↗</span>
                  </a>
                ))}
              </div>
            </>
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
              <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600/20 border border-orange-600/30 text-orange-400 hover:bg-orange-600/30 transition-colors text-xs font-medium">
                <Printer size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
