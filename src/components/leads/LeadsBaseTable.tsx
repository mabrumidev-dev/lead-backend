import { useMemo } from 'react'
import { Lead } from '@/types/lead'
import { 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  Shield,
  Target,
  Trash,
  ArrowDownUp,
  CheckCircle,
  XCircle,
  Eye,
  Palette,
  Info
} from 'lucide-react'

interface LeadsBaseTableProps {
  leads: Lead[]
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onRemoveFromBase: (leadId: string) => void
}

export const LeadsBaseTable: React.FC<LeadsBaseTableProps> = ({
  leads,
  onStatusChange,
  onRemoveFromBase
}) => {
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

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
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
                    onClick={() => onRemoveFromBase(lead.id)}
                    title="Remover da base"
                    className="p-1 rounded bg-slate-800/50 hover:bg-red-500/20 transition-colors text-red-400"
                  >
                    <XCircle size={12} className="text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}