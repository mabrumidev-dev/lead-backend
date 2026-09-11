export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  age?: number | null
  city: string
  plan: 'Individual' | 'Empresarial' | 'Grupo'
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  score: number // 0-100
  source: 'website' | 'referral' | 'purchase' | 'IA Vision' | 'Google Maps' | 'CSV'
  created_at: string
  enriched_data?: any | null
  website?: string | null
  cnpj?: string | null
  responsavel?: string | null
}

export interface FilterOptions {
  city?: string
  minAge?: number
  maxAge?: number
  plan?: Lead['plan']
  status?: Lead['status']
}

export const INITIAL_FILTERS: FilterOptions = {
  minAge: 25,
  maxAge: 40,
  plan: 'Individual'
}

// ── Pipeline stages ──
export const PIPELINE_STAGES: { key: Lead['status']; label: string; color: string; bgColor: string; borderColor: string; icon: string }[] = [
  { key: 'new', label: 'Novo', color: 'text-slate-400', bgColor: 'bg-slate-500/15', borderColor: 'border-slate-500/25', icon: '🆕' },
  { key: 'contacted', label: 'Contactado', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/25', icon: '📞' },
  { key: 'qualified', label: 'Qualificado', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/25', icon: '⭐' },
  { key: 'proposal', label: 'Proposta', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/25', icon: '📄' },
  { key: 'negotiation', label: 'Negociação', color: 'text-violet-400', bgColor: 'bg-violet-500/15', borderColor: 'border-violet-500/25', icon: '🤝' },
  { key: 'won', label: 'Ganho', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/25', icon: '✅' },
  { key: 'lost', label: 'Perdido', color: 'text-rose-400', bgColor: 'bg-rose-500/15', borderColor: 'border-rose-500/25', icon: '❌' },
]

export function getStageInfo(status: Lead['status']) {
  return PIPELINE_STAGES.find(s => s.key === status) || PIPELINE_STAGES[0]
}
