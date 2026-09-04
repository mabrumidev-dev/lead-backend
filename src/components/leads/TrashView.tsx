import { useState } from 'react'
import { Trash2, RotateCcw, XCircle, Users, Phone, AlertTriangle } from 'lucide-react'
import { LeadInBase } from '@/hooks/useBaseLeads'

interface TrashViewProps {
  trashedLeads: LeadInBase[]
  onRestore: (leadId: string) => void
  onPermanentDelete: (leadId: string) => void
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashedLeads,
  onRestore,
  onPermanentDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (trashedLeads.length === 0) {
    return (
      <div className="p-4 sm:p-8 text-center">
        <Trash2 size={48} className="mx-auto text-slate-600 mb-4" />
        <p className="text-slate-500 text-lg">Lixeira vazia</p>
        <p className="text-slate-500 mt-2">Leads excluídos aparecem aqui por 30 dias antes de serem removidos permanentemente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Trash2 size={20} className="text-red-400" />
        <h3 className="text-lg font-semibold text-white">Lixeira</h3>
        <span className="text-xs text-slate-500">{trashedLeads.length} lead(s)</span>
      </div>

      <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-700/50">
            <tr className="text-slate-400 text-xs uppercase">
              <th className="py-3 px-4 text-left">Lead</th>
              <th className="py-3 px-4 text-left">Contato</th>
              <th className="py-3 px-4 text-left">Cidade</th>
              <th className="py-3 px-4 text-left">Excluído em</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {trashedLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-900/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center">
                      <Users size={16} className="text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-300">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-500" />
                    <span className="text-slate-400 text-sm">{lead.phone || '---'}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-400 text-sm">{lead.city || '---'}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-500 text-sm">
                    {lead.deletedAt ? new Date(lead.deletedAt).toLocaleDateString('pt-BR') : '---'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => onRestore(lead.id)}
                      title="Restaurar lead"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                    >
                      <RotateCcw size={12} /> Restaurar
                    </button>
                    {confirmDelete === lead.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onPermanentDelete(lead.id)
                            setConfirmDelete(null)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
                        >
                          <AlertTriangle size={12} /> Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(lead.id)}
                        title="Excluir permanentemente"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                      >
                        <XCircle size={12} /> Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
