import { useState, useMemo } from 'react'
import { Lead } from '@/types/lead'
import { Send, Users, Phone, XCircle, Loader2, Zap, LogOut } from 'lucide-react'

interface DispatchState { total: number; sent: number; failed: number; pending: number }

export const LeadsDispatchWhatsApp: React.FC<{
  leads: Lead[]; onClose: () => void
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onRemoveFromBase: (leadId: string) => void
}> = ({ leads, onClose, onStatusChange, onRemoveFromBase }) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('Olá {nome}! Vi que você utiliza o plano {plano}. Tenho uma proposta exclusiva para {cidade}. Posso te enviar?')
  const [isSending, setIsSending] = useState(false)
  const [dispatchStats, setDispatchStats] = useState<DispatchState>({ total: 0, sent: 0, failed: 0, pending: 0 })
  const [showConfirmation, setShowConfirmation] = useState(false)

  const selectedCount = useMemo(() => selectedLeads.size, [selectedLeads])
  const canDispatch = selectedCount > 0 && message.trim().length > 0

  const personalizeMessage = (template: string, lead: Lead) =>
    template.replace(/\{nome\}/g, lead.name).replace(/\{plano\}/g, lead.plan).replace(/\{cidade\}/g, lead.city).replace(/\{telefone\}/g, lead.phone)

  const handleSendMessages = async () => {
    if (!canDispatch || isSending) return
    const leadsToDispatch = leads.filter(l => selectedLeads.has(l.id))
    if (leadsToDispatch.length === 0) return

    setIsSending(true)
    setDispatchStats({ total: leadsToDispatch.length, sent: 0, failed: 0, pending: leadsToDispatch.length })

    let sent = 0, failed = 0
    const apiBase = import.meta.env.VITE_API_URL || window.location.origin

    for (const lead of leadsToDispatch) {
      try {
        const response = await fetch(`${apiBase}/api/whatsapp/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: lead.phone, message: personalizeMessage(message, lead), leadId: lead.id })
        })
        if (response.ok) { sent++; onStatusChange(lead.id, 'contacted') } else failed++
      } catch { failed++ }
      setDispatchStats(prev => ({ ...prev, sent, failed, pending: prev.pending - 1 }))
    }

    setDispatchStats({ total: leadsToDispatch.length, sent, failed, pending: 0 })
    setIsSending(false); setShowConfirmation(true)
    setTimeout(() => { setSelectedLeads(new Set()); setMessage('') }, 1500)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Disparo WhatsApp</h3>
            <p className="text-sm text-slate-500">Envie mensagens personalizadas em massa</p>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-cyan-400" />
            <span className="text-sm text-slate-400">{selectedCount} selecionados</span>
          </div>
        </div>

        {/* Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Leads na base ({leads.length})</span>
            <button onClick={() => setSelectedLeads(new Set())} className="btn-ghost text-xs px-3 py-1.5">Limpar seleção</button>
          </div>
          <div className="glass-sm max-h-40 overflow-y-auto p-2 space-y-1">
            {leads.map(lead => (
              <label key={lead.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedLeads.has(lead.id) ? 'bg-cyan-500/5' : 'hover:bg-slate-800/30'}`}>
                <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={e => {
                  const n = new Set(selectedLeads)
                  if (e.target.checked) n.add(lead.id); else n.delete(lead.id)
                  setSelectedLeads(n)
                }} />
                <Phone size={14} className="text-cyan-400" />
                <span className="text-sm text-white flex-1 truncate">{lead.name}</span>
                <span className="text-xs text-slate-500">{lead.phone}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Template de Mensagem</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="input-field resize-none" placeholder="Use {nome}, {plano}, {cidade}" />
          {canDispatch && message.includes('{') && (
            <div className="mt-3 glass-sm p-3 border-emerald-500/20">
              <p className="text-xs text-emerald-400 mb-2">Pré-visualização:</p>
              {leads.filter(l => selectedLeads.has(l.id)).slice(0, 2).map(lead => (
                <div key={lead.id} className="text-xs text-slate-300 mb-1 pl-2 border-l-2 border-emerald-500/30">
                  <span className="text-slate-500">{lead.name}:</span> {personalizeMessage(message, lead)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: dispatchStats.total, color: 'text-white' },
            { label: 'Enviados', value: dispatchStats.sent, color: 'text-emerald-400' },
            { label: 'Falhos', value: dispatchStats.failed, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="glass-sm p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSendMessages} disabled={!canDispatch || isSending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar Mensagens</>}
          </button>
          <button onClick={onClose} className="btn-ghost flex items-center gap-2">
            <LogOut size={16} /> Fechar
          </button>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowConfirmation(false)}>
          <div className="glass p-8 max-w-md mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-white mb-2">Mensagens enviadas!</h3>
              <p className="text-slate-400 mb-6">{dispatchStats.sent} de {dispatchStats.total} enviadas com sucesso</p>
              <button onClick={() => { setShowConfirmation(false); onClose() }} className="btn-primary w-full">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
