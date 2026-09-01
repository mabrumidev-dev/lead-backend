import { useMemo } from 'react'
import { Lead } from '@/types/lead'
import { Users, Phone, Eye, CheckCircle, XCircle, ArrowDownUp } from 'lucide-react'

interface LeadsBaseTableProps {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onRemoveFromBase: (leadId: string) => void
}

export const LeadsBaseTable: React.FC<LeadsBaseTableProps> = ({ leads, onStatusChange, onRemoveFromBase }) => {
  if (leads.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4">
          <Users size={32} className="text-slate-600" />
        </div>
        <p className="text-lg text-slate-400 mb-2">Base vazia</p>
        <p className="text-sm text-slate-600">Capture leads em "Buscar Leads" e adicione à base</p>
      </div>
    )
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Contato</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Score</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => {
              const statusConfig = {
                new: { label: 'Novo', class: 'badge-rose' },
                contacted: { label: 'Contactado', class: 'badge-amber' },
                qualified: { label: 'Qualificado', class: 'badge-emerald' },
              }[lead.status] || { label: lead.status, class: 'badge-cyan' }

              return (
                <tr key={lead.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/15 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                        {(lead.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-[13px]">{lead.name}</p>
                        <p className="text-[11px] text-slate-500">{lead.email || 'Sem email'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${lead.plan === 'Empresarial' ? 'badge-blue' : lead.plan === 'Grupo' ? 'badge-amber' : 'badge-cyan'}`}>
                      {lead.plan}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusConfig.class}`}>{statusConfig.label}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${(lead.score || 0) >= 75 ? 'bg-emerald-500' : (lead.score || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${lead.score || 0}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-400">{lead.score || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onStatusChange(lead.id, 'new')} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all" title="Novo">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onStatusChange(lead.id, 'contacted')} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition-all" title="Contactado">
                        <ArrowDownUp size={14} />
                      </button>
                      <button onClick={() => onStatusChange(lead.id, 'qualified')} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 transition-all" title="Qualificado">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => onRemoveFromBase(lead.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all" title="Remover">
                        <XCircle size={14} />
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
  )
}
