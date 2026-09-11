import { useState, useMemo, useCallback, useRef } from 'react'
import { Lead, PIPELINE_STAGES, getStageInfo } from '@/types/lead'
import { GripVertical, Phone, Mail, Building2, Star, MapPin, Eye, Trash2, ArrowRight, TrendingUp, Users, XCircle, Plus } from 'lucide-react'

interface Props {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onTrashLead: (leadId: string) => void
  showToast: (msg: string, type?: string) => void
}

function fmtCNPJ(v: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return v
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400 bg-emerald-500/15'
  if (score >= 50) return 'text-amber-400 bg-amber-500/15'
  return 'text-slate-400 bg-slate-500/15'
}

export default function PipelineKanban({ leads, onStatusChange, onTrashLead, showToast }: Props) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [compactView, setCompactView] = useState(false)

  // Group leads by status
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    for (const stage of PIPELINE_STAGES) {
      grouped[stage.key] = []
    }
    for (const lead of leads) {
      const key = lead.status || 'new'
      if (grouped[key]) grouped[key].push(lead)
      else grouped['new'].push(lead)
    }
    return grouped
  }, [leads])

  // Pipeline stats
  const stats = useMemo(() => {
    const total = leads.length
    const won = leads.filter(l => l.status === 'won').length
    const lost = leads.filter(l => l.status === 'lost').length
    const inPipeline = total - won - lost
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0'
    const avgScore = total > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / total) : 0
    return { total, won, lost, inPipeline, conversionRate, avgScore }
  }, [leads])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
    // Add drag styling
    const el = e.currentTarget as HTMLElement
    setTimeout(() => el.classList.add('opacity-50', 'scale-95'), 0)
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedLead(null)
    setDragOverStage(null)
    const el = e.currentTarget as HTMLElement
    el.classList.remove('opacity-50', 'scale-95')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, stageKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageKey)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, stageKey: Lead['status']) => {
    e.preventDefault()
    setDragOverStage(null)
    if (draggedLead && draggedLead.status !== stageKey) {
      onStatusChange(draggedLead.id, stageKey)
      const stage = getStageInfo(stageKey)
      showToast(`${draggedLead.name} → ${stage.label}`, 'success')
    }
    setDraggedLead(null)
  }, [draggedLead, onStatusChange, showToast])

  // Quick move (click)
  const handleQuickMove = useCallback((lead: Lead, targetStage: Lead['status']) => {
    if (lead.status !== targetStage) {
      onStatusChange(lead.id, targetStage)
      const stage = getStageInfo(targetStage)
      showToast(`${lead.name} → ${stage.label}`, 'success')
    }
  }, [onStatusChange, showToast])

  return (
    <div className="space-y-4">
      {/* Pipeline Header */}
      <div className="glass p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <TrendingUp size={18} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pipeline de Vendas</h3>
              <p className="text-xs text-slate-500">Arraste os leads entre estágios • {leads.length} leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={compactView} onChange={e => setCompactView(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-violet-500" />
              <span className="text-[10px] text-slate-500">Compacto</span>
            </label>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="glass-sm p-3 text-center">
            <p className="text-lg font-bold text-white">{stats.total}</p>
            <p className="text-[9px] text-slate-500 uppercase">Total</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-lg font-bold text-cyan-400">{stats.inPipeline}</p>
            <p className="text-[9px] text-slate-500 uppercase">No Pipeline</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{stats.won}</p>
            <p className="text-[9px] text-slate-500 uppercase">Ganhos</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-lg font-bold text-rose-400">{stats.lost}</p>
            <p className="text-[9px] text-slate-500 uppercase">Perdidos</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-lg font-bold text-violet-400">{stats.conversionRate}%</p>
            <p className="text-[9px] text-slate-500 uppercase">Conversão</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leadsByStage[stage.key] || []
            const isDragOver = dragOverStage === stage.key

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-64 rounded-xl border transition-all duration-200 ${
                  isDragOver
                    ? `${stage.borderColor} ${stage.bgColor} scale-[1.02] shadow-lg shadow-${stage.key === 'won' ? 'emerald' : stage.key === 'lost' ? 'rose' : 'cyan'}-500/10`
                    : 'border-slate-700/50 bg-slate-900/30'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key as Lead['status'])}
              >
                {/* Column Header */}
                <div className={`p-3 border-b ${isDragOver ? stage.borderColor : 'border-slate-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{stage.icon}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${stage.color}`}>{stage.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.bgColor} ${stage.color}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className={`p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto ${compactView ? 'space-y-1' : 'space-y-2'}`}>
                  {stageLeads.map(lead => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      compact={compactView}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onView={() => setViewLead(lead)}
                      onQuickMove={handleQuickMove}
                      onTrash={() => { onTrashLead(lead.id); showToast(`${lead.name} → Lixeira`, 'info') }}
                    />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                      <Plus size={20} className="mb-1" />
                      <p className="text-[10px]">Arraste leads aqui</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {viewLead && (
        <LeadDetailModal lead={viewLead} onClose={() => setViewLead(null)} onQuickMove={handleQuickMove} onTrash={() => { onTrashLead(viewLead.id); setViewLead(null) }} />
      )}
    </div>
  )
}

// ── Kanban Card ──
function KanbanCard({ lead, compact, onDragStart, onDragEnd, onView, onQuickMove, onTrash }: {
  lead: Lead; compact: boolean
  onDragStart: (e: React.DragEvent, lead: Lead) => void
  onDragEnd: (e: React.DragEvent) => void
  onView: () => void; onQuickMove: (lead: Lead, stage: Lead['status']) => void; onTrash: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const enriched = lead.enriched_data
  const hasCNPJ = !!enriched?.CNPJ
  const displayName = enriched?.NomeFantasia || lead.name

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border border-slate-700/50 bg-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all cursor-grab active:cursor-grabbing ${compact ? 'p-2' : 'p-3'}`}
    >
      {/* Card header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/15 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0 mt-0.5">
          {displayName[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          {!compact && enriched?.RazaoSocial && enriched.RazaoSocial !== displayName && (
            <p className="text-[10px] text-slate-500 truncate">{enriched.RazaoSocial}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onView() }} className="p-1 rounded hover:bg-cyan-500/10 text-slate-600 hover:text-cyan-400" title="Ver detalhes">
            <Eye size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }} className="p-1 rounded hover:bg-slate-700 text-slate-600 hover:text-slate-400" title="Mover para...">
            <ArrowRight size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onTrash() }} className="p-1 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400" title="Lixeira">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Badges */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {hasCNPJ && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CNPJ</span>}
          {lead.score >= 70 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-400">⭐ {lead.score}</span>}
          {lead.score >= 50 && lead.score < 70 && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 text-amber-400">⭐ {lead.score}</span>}
          {enriched?.Porte && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/15 text-blue-400">{enriched.Porte}</span>}
          {enriched?.IdentificadorMatrizFilial === 'Matriz' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400">MAT</span>}
        </div>
      )}

      {/* Contact info */}
      {!compact && (
        <div className="space-y-1">
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10} className="text-cyan-400 shrink-0" />
              <span className="text-[10px] text-slate-400 truncate">{lead.phone}</span>
            </div>
          )}
          {lead.city && (
            <div className="flex items-center gap-1.5">
              <MapPin size={10} className="text-slate-500 shrink-0" />
              <span className="text-[10px] text-slate-500 truncate">{lead.city}{enriched?.UF ? `/${enriched.UF}` : ''}</span>
            </div>
          )}
          {enriched?.AtividadePrincipal && (
            <div className="flex items-center gap-1.5">
              <Building2 size={10} className="text-slate-500 shrink-0" />
              <span className="text-[10px] text-slate-500 truncate">{enriched.AtividadePrincipal}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick move context menu */}
      {showMenu && (
        <div className="mt-2 p-1.5 rounded-lg bg-slate-900 border border-slate-700 space-y-0.5" onClick={e => e.stopPropagation()}>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider px-1.5 mb-1">Mover para:</p>
          {PIPELINE_STAGES.filter(s => s.key !== lead.status).map(stage => (
            <button key={stage.key} onClick={() => { onQuickMove(lead, stage.key); setShowMenu(false) }}
              className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span>{stage.icon}</span> {stage.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Lead Detail Modal ──
function LeadDetailModal({ lead, onClose, onQuickMove, onTrash }: {
  lead: Lead; onClose: () => void; onQuickMove: (lead: Lead, stage: Lead['status']) => void; onTrash: () => void
}) {
  const enriched = lead.enriched_data
  const stage = getStageInfo(lead.status)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-2xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
          <XCircle size={18} />
        </button>
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400 shrink-0">
              {(enriched?.NomeFantasia || lead.name)[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyan-400">{enriched?.NomeFantasia || lead.name}</h2>
              {enriched?.RazaoSocial && <p className="text-xs text-slate-500">{enriched.RazaoSocial}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.bgColor} ${stage.color} border ${stage.borderColor}`}>
                  {stage.icon} {stage.label}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(lead.score)}`}>
                  ⭐ {lead.score}
                </span>
              </div>
            </div>
          </div>

          {/* Pipeline move */}
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Mover para:</p>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.filter(s => s.key !== lead.status).map(s => (
                <button key={s.key} onClick={() => { onQuickMove(lead, s.key); onClose() }}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${s.borderColor} ${s.bgColor} ${s.color} hover:scale-105 transition-transform`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 my-4" />

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <Field emoji="📞" label="Telefone" value={lead.phone} />
            <Field emoji="✉️" label="Email" value={enriched?.Email || lead.email} />
            <Field emoji="📍" label="Cidade" value={`${lead.city || ''}${enriched?.UF ? `/${enriched.UF}` : ''}`} />
            {enriched?.CNPJ && <Field emoji="🏢" label="CNPJ" value={fmtCNPJ(enriched.CNPJ)} />}
            {enriched?.Porte && <Field emoji="📊" label="Porte" value={enriched.Porte} />}
            {enriched?.AtividadePrincipal && <Field emoji="⚙️" label="Atividade" value={enriched.AtividadePrincipal} />}
            {enriched?.CapitalSocial && <Field emoji="💰" label="Capital" value={`R$ ${Number(enriched.CapitalSocial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />}
            {enriched?.SituacaoCadastral && <Field emoji="✅" label="Situação" value={enriched.SituacaoCadastral} />}
          </div>

          <div className="border-t border-slate-700 mt-4 pt-4 flex gap-2">
            <button onClick={onTrash} className="btn-ghost text-sm flex items-center gap-1.5 text-rose-400 hover:text-rose-300">
              <Trash2 size={14} /> Lixeira
            </button>
            <button onClick={onClose} className="btn-ghost text-sm ml-auto">Fechar</button>
          </div>
        </div>
      </div>
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
