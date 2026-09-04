import { useMemo, useState } from 'react'
import { Lead } from '@/types/lead'
import { 
  Users, 
  Phone, 
  Trash,
  CheckCircle,
  XCircle,
  Eye,
  Info,
  Loader2,
  RotateCcw,
} from 'lucide-react'

interface LeadsBaseTableProps {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onTrashLead: (leadId: string) => void
  onReprocessLead: (leadId: string) => Promise<boolean>
}

export const LeadsBaseTable: React.FC<LeadsBaseTableProps> = ({
  leads,
  onStatusChange,
  onTrashLead,
  onReprocessLead,
}) => {
  const [reprocessing, setReprocessing] = useState<Set<string>>(new Set())
  const [viewLead, setViewLead] = useState<any>(null)

  const computedLeads = useMemo(
    () =>
      leads.map(lead => ({
        ...lead,
        ageDisplay: lead.age ? `${lead.age} anos` : 'Não informado',
        statusColor: {
          new: 'text-red-400',
          contacted: 'text-yellow-400',
          qualified: 'text-green-400'
        }[lead.status] || 'text-slate-400'
      })),
    [leads]
  )

  const handleReprocess = async (leadId: string) => {
    setReprocessing(prev => new Set(prev).add(leadId))
    try {
      await onReprocessLead(leadId)
    } finally {
      setReprocessing(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  if (leads.length === 0) {
    return (
      <div className="p-4 sm:p-8 text-center">
        <p className="text-slate-500 text-lg">Nenhum lead na base ainda.</p>
        <p className="text-slate-500 mt-2">Capture leads no módulo "Buscar Leads" e clique em "Adicionar na Base" para adicioná-los aqui.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-table">
        <thead className="border-b border-slate-800/50">
          <tr className="text-slate-400 text-xs uppercase">
            <th className="py-3 px-4 text-left">Lead</th>
            <th className="py-3 px-4 text-left">Contato</th>
            <th className="py-3 px-4 text-left">Idade</th>
            <th className="py-3 px-4 text-left">Plano</th>
            <th className="py-3 px-4 text-left">Status</th>
            <th className="py-3 px-4 text-left">Score</th>
            <th className="py-3 px-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {computedLeads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-900/30 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-800/50 flex items-center justify-center">
                    <Users size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-cyan-400" />
                  <a href={`tel:${lead.phone}`} className="text-cyan-400 hover:underline text-sm">
                    {lead.phone}
                  </a>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`text-slate-400 font-medium ${lead.ageDisplay}`}>
                  {lead.ageDisplay}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs ${lead.plan === 'Individual' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {lead.plan}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs ${lead.statusColor}`}>
                  {lead.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`text-${lead.score >= 75 ? 'green' : lead.score >= 50 ? 'yellow' : 'red'}-400 font-medium`}>
                  {lead.score}%
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setViewLead(lead)}
                    title="Ver detalhes"
                    className="p-1 rounded bg-slate-800/50 hover:bg-cyan-500/20 transition-colors text-cyan-400"
                  >
                    <Eye size={12} className="text-cyan-400" />
                  </button>
                  <button
                    onClick={() => handleReprocess(lead.id)}
                    disabled={reprocessing.has(lead.id)}
                    title="Atualizar lead (re-processar dados)"
                    className="p-1 rounded bg-slate-800/50 hover:bg-amber-500/20 transition-colors text-amber-400 disabled:opacity-40"
                  >
                    {reprocessing.has(lead.id) ? (
                      <Loader2 size={12} className="animate-spin text-amber-400" />
                    ) : (
                      <RotateCcw size={12} className="text-amber-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onStatusChange(lead.id, 'new')}
                    title="Marcar como novo"
                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-slate-400"
                  >
                    <Eye size={12} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => onStatusChange(lead.id, 'contacted')}
                    title="Marcar como contactado"
                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-slate-400"
                  >
                    <Info size={12} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => onStatusChange(lead.id, 'qualified')}
                    title="Qualificar lead"
                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-slate-400"
                  >
                    <CheckCircle size={12} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => onTrashLead(lead.id)}
                    title="Mover para lixeira"
                    className="p-1 rounded bg-slate-800/50 hover:bg-red-500/20 transition-colors text-red-400"
                  >
                    <Trash size={12} className="text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Lead Detail Modal */}
      {viewLead && (() => {
        const phoneKey = (viewLead.phone || '').replace(/\D/g, '')
        const allEnriched = JSON.parse(localStorage.getItem('mabrumi_enriched_leads') || '{}')
        const enriched = viewLead.enriched_data || allEnriched[phoneKey] || allEnriched[`lead_${viewLead.id}`] || null
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
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewLead(null)}>
            <div className="relative w-full max-w-5xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewLead(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
                <XCircle size={18} />
              </button>
              <div className="p-5 max-h-[85vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{viewLead.name || 'Lead'}</h2>
                <p className="text-xs text-slate-500 mb-4">Dados do lead na base</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Telefone</p><p className="text-sm text-slate-200">📞 {viewLead.phone || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Email</p><p className="text-sm text-slate-200">✉️ {enriched?.Email || viewLead.email || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Cidade</p><p className="text-sm text-slate-200">📍 {viewLead.city || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Plano</p><p className="text-sm text-slate-200">🏷️ {viewLead.plan || 'Não informado'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Score</p><p className="text-sm text-slate-200">⭐ {viewLead.score ? `${viewLead.score}%` : 'N/A'}</p></div>
                  <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Status</p><p className="text-sm text-slate-200">📊 {viewLead.status || 'new'}</p></div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      {enriched.CNPJ && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">CNPJ</p><p className="text-sm text-slate-200">📋 {fmtCNPJ(enriched.CNPJ)}</p></div>}
                      {enriched.RazaoSocial && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Razão Social</p><p className="text-sm text-slate-200">{enriched.RazaoSocial}</p></div>}
                      {enriched.NomeFantasia && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Nome Fantasia</p><p className="text-sm text-slate-200">{enriched.NomeFantasia}</p></div>}
                      {enriched.Porte && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Porte</p><p className="text-sm text-slate-200">{enriched.Porte}</p></div>}
                      {enriched.AtividadePrincipal && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Atividade Principal</p><p className="text-sm text-slate-200">{enriched.AtividadePrincipal}</p></div>}
                      {enriched.Email && <div className="py-1.5"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Email</p><p className="text-sm text-slate-200">{enriched.Email}</p></div>}
                      {enriched.EnderecoCompleto && <div className="py-1.5 col-span-2"><p className="text-[11px] text-slate-500 uppercase tracking-wider">Endereço</p><p className="text-sm text-slate-200">📍 {enriched.EnderecoCompleto}</p></div>}
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
                            </tr></thead>
                            <tbody>{enriched.QSA.map((q: any, i: number) => (
                              <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                                <td className="px-3 py-2 text-slate-200 font-medium">{q.nome}</td>
                                <td className="px-3 py-2 text-slate-300">{q.qualificacao}</td>
                                <td className="px-3 py-2 text-slate-300">{q.entrada}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}

                {enriched && enriched.HealthPlan && (
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

                {enriched && enriched.EmployeeCount && enriched.EmployeeCount.fonte && (
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

                {enriched && (() => {
                  const social = enriched.SocialMedia || {}
                  const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url)
                  if (socialEntries.length === 0) return null
                  return (
                    <>
                      <div className="border-t border-slate-700 my-4" />
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🔗</span>
                        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Redes Sociais ({socialEntries.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
                        {socialEntries.map(([platform, data]: any) => (
                          <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                            <span className="text-sm">{platform === 'Instagram' ? '📸' : platform === 'Facebook' ? '📘' : platform === 'LinkedIn' ? '💼' : platform === 'Twitter' ? '🐦' : platform === 'YouTube' ? '▶️' : '🔗'}</span>
                            <span className="text-xs text-cyan-400 truncate">{platform}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  )
                })()}

                {!enriched && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-center">
                    <p className="text-slate-500 text-xs">Dados enriquecidos não disponíveis. Clique no botão 🔄 "Atualizar Lead" para buscar dados.</p>
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
