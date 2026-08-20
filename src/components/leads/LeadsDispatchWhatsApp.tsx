import { useState, useMemo } from 'react'
import { Lead } from '@/types/lead'
import { 
  Send, 
  MessageCircle, 
  Users,
  CheckCircle,
  XCircle,
  ArrowDownUp,
  Target,
  Shield,
  Building2,
  Palette,
  Eye,
  Info,
  Heart,
  Stethoscope,
  Activity,
  Filter,
  Calendar,
  Phone,
  Trash,
  Music,
  Layout,
  Folder,
  RefreshCw,
  Loader2,
  Zap,
  MessageSquare,
  LogOut,
} from 'lucide-react'

interface LeadForDispatch extends Lead {
  selected?: boolean
}

interface DispatchState {
  total: number
  sent: number
  failed: number
  pending: number
}

const INITIAL_DISPATCH_STATE: DispatchState = {
  total: 0,
  sent: 0,
  failed: 0,
  pending: 0
}

export const LeadsDispatchWhatsApp: React.FC<{
  leads: Lead[]
  onClose: () => void
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onRemoveFromBase: (leadId: string) => void
}> = ({
  leads,
  onClose,
  onStatusChange,
  onRemoveFromBase
}) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string>('Olá {nome}! Vi que você utiliza o plano {plano}. Tenho uma proposta exclusiva para sua região em {cidade}. Posso te enviar?')
  const [isSending, setIsSending] = useState(false)
  const [dispatchStats, setDispatchStats] = useState<DispatchState>(INITIAL_DISPATCH_STATE)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSentModal, setShowSentModal] = useState(false)

  const leadsForDispatch = useMemo<LeadForDispatch[]>(
    () => leads.map(lead => ({ ...lead, selected: selectedLeads.has(lead.id) })),
    [leads, selectedLeads]
  )

  const selectedCount = useMemo(() => selectedLeads.size, [selectedLeads])
  const canDispatch = selectedCount > 0 && message.trim().length > 0

  const personalizeMessage = (template: string, lead: Lead) => {
    return template
      .replace(/\{nome\}/g, lead.name)
      .replace(/\{plano\}/g, lead.plan)
      .replace(/\{cidade\}/g, lead.city)
      .replace(/\{telefone\}/g, lead.phone)
  }

  // Handle selection toggle
  const handleSelectToggle = (leadId: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }

  // Send WhatsApp messages
  const handleSendMessages = async () => {
    if (!canDispatch || isSending) return

    const leadsToDispatch = leadsForDispatch.filter(lead => lead.selected)
    
    if (leadsToDispatch.length === 0) return

    setIsSending(true)
    setDispatchStats({
      total: leadsToDispatch.length,
      sent: 0,
      failed: 0,
      pending: leadsToDispatch.length
    })

    // Simulate sending messages
    let sent = 0
    let failed = 0

    for (const lead of leadsToDispatch) {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 80% success rate simulation
        const success = Math.random() > 0.2
        
        if (success) {
          sent++
          // Update lead status to contacted
          onStatusChange(lead.id, 'contacted')
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }

    setDispatchStats({ total: leadsToDispatch.length, sent, failed, pending: 0 })
    setIsSending(false)
    setShowConfirmation(true)

    // Clear selection after delay
    setTimeout(() => {
      setSelectedLeads(new Set())
      setMessage('')
    }, 1500)
  }

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedLeads(new Set())
    setMessage('')
  }

  return (
    <div className="p-4 sm:p-8 bg-slate-900/50 rounded-xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3">
        <div>
          <h2 className="text-2xl font-bold">Disparo WhatsApp</h2>
          <p className="text-slate-400 mb-2">Enviar mensagem personalizada para leads da base</p>
          <p className="text-slate-500 text-sm">Seleccione leads e digite sua mensagem abaixo.</p>
        </div>
        <div className="flex items-center gap-3">
          <Zap size={20} className="text-cyan-400" />
          <span className="text-slate-400"> {selectedCount} selecionados</span>
        </div>
      </div>

      {/* Selection panel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400">Leads na base ({leads.length})</span>
          <span className={`text-slate-400 font-medium ${selectedCount > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
            {selectedCount} de {leads.length} selecionados
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDeselectAll}
            disabled={selectedCount === 0}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-400/30'}`}
          >
            <Users size={14} className="mr-1" /> Deselect All
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          {leads.length > 0 && (
            <p>Ctrl + clique para selecionar múltiplos. Total disponível: {leads.length}</p>
          )}
        </div>
      </div>

      {/* Message template */}
      <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Template de Mensagem</h3>
        <textarea
          value={message}
          onChange={handleMessageChange}
          placeholder="Digite sua mensagem aqui... Use {nome}, {plano}, {cidade} para personalizar"
          rows={3}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        ></textarea>
        
        {canDispatch && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Personalização disponível:</span>
            <span className="text-xs text-cyan-400">• Nome do lead • Plano • Cidade</span>
          </div>
        )}
        {canDispatch && message.includes('{') && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-xs text-green-400 mb-2">Pré-visualização personalizada:</p>
            {leadsForDispatch.filter(l => l.selected).slice(0, 2).map(lead => (
              <div key={lead.id} className="text-xs text-slate-300 mb-1 pl-2 border-l-2 border-green-500/30">
                <span className="text-slate-500">{lead.name}:</span> {personalizeMessage(message, lead)}
              </div>
            ))}
            {selectedCount > 2 && <p className="text-xs text-slate-500">+{selectedCount - 2} mensagens similares</p>}
          </div>
        )}
      </div>

      {/* Selected leads preview */}
      {selectedCount > 0 && (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 max-h-40 overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Pré-visualização ({selectedCount} leads)</h3>
          <div className="space-y-1">
            {leadsForDispatch
              .filter(lead => lead.selected)
              .slice(0, 5)
              .map((lead) => (
                <div key={lead.id} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-900/50">
                  <Phone size={12} className="text-cyan-400" />
                  <span className="text-xs text-slate-400 truncate w-[180px]">{lead.name}</span>
                  <span className="text-xs text-cyan-400">{lead.phone}</span>
                </div>
              ))}
            {leadsForDispatch.filter(lead => lead.selected).length > 5 && (
              <div key="extra" className="text-xs text-slate-500">
                +{leadsForDispatch.filter(lead => lead.selected).length - 5} mais
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-6 px-6 pb-4 border-t border-slate-800/50">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-white">{dispatchStats.total}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Enviados</p>
            <p className="text-2xl font-bold text-green-400">{dispatchStats.sent}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Falhos</p>
            <p className="text-2xl font-bold text-red-400">{dispatchStats.failed}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 pt-6 border-t border-slate-800/50">
        <button
          onClick={handleDeselectAll}
          disabled={!canDispatch}
          className={`flex-1 py-3 rounded-lg transition-colors ${!canDispatch ? 'opacity-50 cursor-not-allowed bg-slate-700' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'}`}
        >
          {isSending ? (
            <div className="flex items-center">
              <Loader2 size={18} className="mr-2 animate-spin" />
              <span>Enviando...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Send size={16} className="mr-2" />
              <span>Enviar Mensagens</span>
            </div>
          )}
        </button>
        <button
          onClick={handleDeselectAll}
          className={`flex-1 py-3 rounded-lg transition-colors bg-slate-700 hover:bg-slate-600 text-slate-400`}
        >
          <XCircle size={16} className="mr-2" /> Cancelar
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-zxl z-50 flex items-center justify-center">
          <div className="bg-slate-900/90 rounded-xl p-8 max-w-md w-full backdrop-blur-xl">
            <div className="text-center mb-6">
              {dispatchStats.sent > 0 && (
                <div className="text-4xl mb-3">{dispatchStats.sent} ✅</div>
              )}
              <h3 className="text-2xl font-bold">Mensagens enviadas com sucesso!</h3>
              <p className="text-slate-400 mb-4">{dispatchStats.sent} de {dispatchStats.total} mensagens foram enviadas para os leads selecionados.</p>
              <p className="text-slate-500">Os leads tiveram seu status atualizado para 'contactado'.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  onClose()
                }}
                className="flex-1 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-400 transition-colors"
              >
                OK
              </button>
              <button
                onClick={handleDeselectAll}
                className="flex-1 py-2 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 transition-colors"
              >
                Nova Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close button */}
      <div className="mt-8">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 transition-all duration-300"
        >
          <LogOut size={16} className="mr-2" /> Fechar
        </button>
      </div>
    </div>
  )
}