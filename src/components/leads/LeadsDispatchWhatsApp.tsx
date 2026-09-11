import { useState, useMemo } from 'react'
import { Lead, getStageInfo } from '@/types/lead'
import { Send, Users, Phone, XCircle, Loader2, Zap, LogOut, MessageSquare, FileText, Eye, ChevronDown, Building2, Star, MapPin, Briefcase } from 'lucide-react'

interface DispatchState { total: number; sent: number; failed: number; pending: number }

// ── Template presets ──
const TEMPLATES = [
  {
    id: 'corretora-padrao',
    name: 'Corretora — Apresentação',
    icon: '💼',
    category: 'Corretora',
    message: 'Olá {nome}! 👋\n\nSou corretor de seguros e identifiquei que a {razao_social} atua no setor de {atividade} em {cidade}.\n\nGostaria de apresentar soluções em seguros personalizadas para a empresa. Podemos conversar? 🙏',
  },
  {
    id: 'corretora-plano-saude',
    name: 'Corretora — Plano de Saúde',
    icon: '🏥',
    category: 'Corretora',
    message: 'Olá {nome}! 👋\n\nVi que a {razao_social} ({porte}) está em {cidade}. Trabalho com planos de saúde corporativos e posso ajudar a encontrar a melhor opção para sua equipe.\n\nPosso enviar uma cotação sem compromisso? 😊',
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    icon: '🔄',
    category: 'Geral',
    message: 'Oi {nome}! 😊\n\nEstou entrando em contato novamente sobre a proposta que enviei para a {razao_social}. Conseguiu analisar?\n\nSe tiver alguma dúvida, estou à disposição!',
  },
  {
    id: 'primeiro-contato',
    name: 'Primeiro Contato',
    icon: '👋',
    category: 'Geral',
    message: 'Olá {nome}! 👋\n\nMeu nome é [SEU NOME], sou especialista em seguros para empresas.\n\nIdentifiquei que a {razao_social} pode se beneficiar de soluções em seguros corporativos. Podemos conversar rapidinho? 🙏',
  },
  {
    id: 'proposta-personalizada',
    name: 'Proposta Personalizada',
    icon: '📋',
    category: 'Comercial',
    message: 'Olá {nome}! 📋\n\nPreparei uma proposta exclusiva para a {razao_social}:\n\n🏢 Porte: {porte}\n📍 {cidade}/{uf}\n💼 Setor: {atividade}\n\nA proposta inclui condições especiais para empresas do seu segmento. Posso enviar? ✨',
  },
  {
    id: 'whatsapp-empresarial',
    name: 'WhatsApp Business',
    icon: '💼',
    category: 'Comercial',
    message: 'Olá {nome}! Aqui é o [SEU NOME] da [IMOBILIÁRIA/CORRETORA].\n\nEstamos oferecendo condições especiais para a {razao_social}. Seu CNPJ {cnpj_formatado} qualifica para nossos planos corporativos.\n\nVamos conversar? 📞',
  },
]

function fmtCNPJ(v: string) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return v
}

function getEnrichedField(lead: Lead, field: string): string {
  const e = lead.enriched_data
  if (!e) return ''
  const map: Record<string, string> = {
    razao_social: e.RazaoSocial || '',
    nome_fantasia: e.NomeFantasia || '',
    cnpj: e.CNPJ || '',
    cnpj_formatado: e.CNPJ ? fmtCNPJ(e.CNPJ) : '',
    porte: e.Porte || '',
    atividade: e.AtividadePrincipal || '',
    cnae: e.CNAEFiscal || '',
    cidade: e.Municipio || lead.city || '',
    uf: e.UF || '',
    bairro: e.Bairro || '',
    telefone: e.Telefone1 || lead.phone || '',
    email: e.Email || lead.email || '',
    situacao: e.SituacaoCadastral || '',
    simples: e.OpcaoSimples === true ? 'Sim' : e.OpcaoSimples === false ? 'Não' : '',
    matriz_filial: e.IdentificadorMatrizFilial || '',
    endereco: e.EnderecoCompleto || '',
  }
  return map[field] || ''
}

function personalizeMessage(template: string, lead: Lead): string {
  let msg = template
  // Basic vars
  msg = msg.replace(/\{nome\}/g, lead.name)
  msg = msg.replace(/\{plano\}/g, lead.plan)
  msg = msg.replace(/\{cidade\}/g, lead.city)
  msg = msg.replace(/\{telefone\}/g, lead.phone)
  msg = msg.replace(/\{score\}/g, String(lead.score))
  // CNPJ enriched vars
  msg = msg.replace(/\{razao_social\}/g, getEnrichedField(lead, 'razao_social'))
  msg = msg.replace(/\{nome_fantasia\}/g, getEnrichedField(lead, 'nome_fantasia'))
  msg = msg.replace(/\{cnpj\}/g, getEnrichedField(lead, 'cnpj'))
  msg = msg.replace(/\{cnpj_formatado\}/g, getEnrichedField(lead, 'cnpj_formatado'))
  msg = msg.replace(/\{porte\}/g, getEnrichedField(lead, 'porte'))
  msg = msg.replace(/\{atividade\}/g, getEnrichedField(lead, 'atividade'))
  msg = msg.replace(/\{cnae\}/g, getEnrichedField(lead, 'cnae'))
  msg = msg.replace(/\{uf\}/g, getEnrichedField(lead, 'uf'))
  msg = msg.replace(/\{bairro\}/g, getEnrichedField(lead, 'bairro'))
  msg = msg.replace(/\{email\}/g, getEnrichedField(lead, 'email'))
  msg = msg.replace(/\{situacao\}/g, getEnrichedField(lead, 'situacao'))
  msg = msg.replace(/\{simples\}/g, getEnrichedField(lead, 'simples'))
  msg = msg.replace(/\{endereco\}/g, getEnrichedField(lead, 'endereco'))
  // Fallback for empty enriched fields
  msg = msg.replace(/\{razao_social\}/g, lead.name)
  return msg
}

export const LeadsDispatchWhatsApp: React.FC<{
  leads: Lead[]; onClose: () => void
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onRemoveFromBase: (leadId: string) => void
}> = ({ leads, onClose, onStatusChange, onRemoveFromBase }) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState(TEMPLATES[0].message)
  const [isSending, setIsSending] = useState(false)
  const [dispatchStats, setDispatchStats] = useState<DispatchState>({ total: 0, sent: 0, failed: 0, pending: 0 })
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [filterWithPhone, setFilterWithPhone] = useState(true)

  const selectedCount = useMemo(() => selectedLeads.size, [selectedLeads])
  const canDispatch = selectedCount > 0 && message.trim().length > 0

  // Filter leads with phone
  const filteredLeads = useMemo(() => {
    if (filterWithPhone) return leads.filter(l => l.phone && l.phone.trim().length > 0)
    return leads
  }, [leads, filterWithPhone])

  // Stats about selected leads
  const selectedStats = useMemo(() => {
    const sel = leads.filter(l => selectedLeads.has(l.id))
    const withCNPJ = sel.filter(l => l.enriched_data?.CNPJ).length
    const withPhone = sel.filter(l => l.phone).length
    return { total: sel.length, withCNPJ, withPhone }
  }, [leads, selectedLeads])

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setMessage(template.message)
    setShowTemplates(false)
  }

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
        const personalized = personalizeMessage(message, lead)
        const response = await fetch(`${apiBase}/api/whatsapp/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: lead.phone, message: personalized, leadId: lead.id })
        })
        if (response.ok) {
          sent++
          onStatusChange(lead.id, 'contacted')
        } else {
          failed++
        }
      } catch { failed++ }
      setDispatchStats(prev => ({ ...prev, sent, failed, pending: prev.pending - 1 }))
    }

    setDispatchStats({ total: leadsToDispatch.length, sent, failed, pending: 0 })
    setIsSending(false); setShowConfirmation(true)
    setTimeout(() => { setSelectedLeads(new Set()) }, 1500)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  // Count variables used in template
  const templateVars = useMemo(() => {
    const matches = message.match(/\{(\w+)\}/g) || []
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
  }, [message])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <MessageSquare size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">WhatsApp Inteligente</h3>
              <p className="text-xs text-slate-500">Templates com variáveis CNPJ • {leads.length} leads na base</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs flex items-center gap-1.5">
            <LogOut size={14} /> Fechar
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="glass-sm p-3 text-center">
            <p className="text-xl font-bold text-white">{leads.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total Base</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-xl font-bold text-cyan-400">{leads.filter(l => l.enriched_data?.CNPJ).length}</p>
            <p className="text-[10px] text-slate-500 uppercase">CNPJ Enriched</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{leads.filter(l => l.phone).length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Com Telefone</p>
          </div>
          <div className="glass-sm p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{selectedCount}</p>
            <p className="text-[10px] text-slate-500 uppercase">Selecionados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Selection + Template */}
        <div className="space-y-4">
          {/* Lead Selection */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">Selecionar Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={filterWithPhone} onChange={e => setFilterWithPhone(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500" />
                  <span className="text-[10px] text-slate-500">Só com telefone</span>
                </label>
                <button onClick={handleSelectAll} className="text-[10px] text-cyan-400 hover:text-cyan-300">
                  {selectedLeads.size === filteredLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {filteredLeads.map(lead => {
                const hasCNPJ = !!lead.enriched_data?.CNPJ
                return (
                  <label key={lead.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedLeads.has(lead.id) ? 'bg-cyan-500/5 border border-cyan-500/20' : 'hover:bg-slate-800/30 border border-transparent'}`}>
                    <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={e => {
                      const n = new Set(selectedLeads)
                      if (e.target.checked) n.add(lead.id); else n.delete(lead.id)
                      setSelectedLeads(n)
                    }} />
                    <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                      {lead.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white truncate">{lead.name}</span>
                        {hasCNPJ && <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400">CNPJ</span>}
                      </div>
                      <span className="text-[10px] text-slate-500">{lead.phone || 'Sem telefone'}</span>
                    </div>
                    {lead.score && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.score >= 70 ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-500'}`}>{lead.score}</span>
                    )}
                  </label>
                )
              })}
              {filteredLeads.length === 0 && (
                <p className="text-center text-slate-600 text-xs py-4">Nenhum lead com telefone</p>
              )}
            </div>
          </div>

          {/* Template Selector */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">Templates Prontos</span>
              </div>
              <button onClick={() => setShowTemplates(!showTemplates)} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                {showTemplates ? 'Ocultar' : 'Ver todos'} <ChevronDown size={10} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className={`space-y-2 ${showTemplates ? 'max-h-60' : 'max-h-32'} overflow-y-auto`}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/30 transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-xs font-medium text-white group-hover:text-cyan-400 transition-colors">{t.name}</span>
                    <span className="text-[9px] text-slate-600 px-1.5 py-0.5 rounded bg-slate-700/50 ml-auto">{t.category}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{t.message.slice(0, 100)}...</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Message Editor + Preview */}
        <div className="space-y-4">
          {/* Message Editor */}
          <div className="glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">Mensagem</span>
            </div>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)} rows={6}
              className="input-field resize-none font-mono text-sm"
              placeholder="Use variáveis como {nome}, {razao_social}, {cnpj}, {porte}..."
            />
            {/* Available vars */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['nome', 'razao_social', 'cnpj', 'porte', 'cidade', 'atividade', 'score', 'telefone', 'email', 'uf'].map(v => (
                <button key={v} onClick={() => setMessage(prev => prev + `{${v}}`)}
                  className="text-[9px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors font-mono">
                  {`{${v}}`}
                </button>
              ))}
            </div>
            {templateVars.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {templateVars.map(v => (
                  <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedCount > 0 && (
            <div className="glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold text-slate-300">Pré-visualização</span>
                <span className="text-[10px] text-slate-500 ml-auto">{selectedStats.withCNPJ} com CNPJ</span>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {leads.filter(l => selectedLeads.has(l.id)).slice(0, 3).map(lead => (
                  <div key={lead.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={12} className="text-cyan-400" />
                      <span className="text-xs font-medium text-white">{lead.name}</span>
                      <span className="text-[10px] text-slate-500">{lead.phone}</span>
                      {lead.enriched_data?.CNPJ && <Building2 size={10} className="text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{personalizeMessage(message, lead)}</p>
                  </div>
                ))}
                {selectedCount > 3 && (
                  <p className="text-center text-[10px] text-slate-600">+{selectedCount - 3} mais leads</p>
                )}
              </div>
            </div>
          )}

          {/* Dispatch Stats */}
          {(dispatchStats.total > 0 || isSending) && (
            <div className="glass p-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: dispatchStats.total, color: 'text-white' },
                  { label: 'Enviados', value: dispatchStats.sent, color: 'text-emerald-400' },
                  { label: 'Falhos', value: dispatchStats.failed, color: 'text-rose-400' },
                  { label: 'Pendente', value: dispatchStats.pending, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-500 uppercase">{s.label}</p>
                  </div>
                ))}
              </div>
              {isSending && (
                <div className="mt-3 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${dispatchStats.total > 0 ? ((dispatchStats.sent + dispatchStats.failed) / dispatchStats.total) * 100 : 0}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button onClick={handleSendMessages} disabled={!canDispatch || isSending}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {isSending ? (
              <><Loader2 size={18} className="animate-spin" /> Enviando {dispatchStats.sent + dispatchStats.failed}/{dispatchStats.total}...</>
            ) : (
              <><Send size={16} /> Enviar para {selectedCount} lead(s)</>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowConfirmation(false)}>
          <div className="glass p-8 max-w-md mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-white mb-2">Mensagens enviadas!</h3>
              <p className="text-slate-400 mb-2">{dispatchStats.sent} de {dispatchStats.total} enviadas com sucesso</p>
              {dispatchStats.failed > 0 && <p className="text-rose-400 text-sm mb-4">{dispatchStats.failed} falha(s)</p>}
              <button onClick={() => { setShowConfirmation(false); onClose() }} className="btn-primary w-full">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
