import { useState } from 'react'
import { Search, Users, Filter, Calendar, Heart, Shield, Target, Database } from 'lucide-react'
import { Lead, FilterOptions } from '@/types/lead'

interface LeadsFiltersProps {
  initialFilters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
}

export const LeadsFilters: React.FC<LeadsFiltersProps> = ({ initialFilters, onFiltersChange }) => {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'range') {
      setFilters(prev => ({ ...prev, [name]: parseFloat(value) }))
    } else {
      setFilters(prev => ({ ...prev, [name]: type === 'select-one' ? value : String(value) }))
    }
  }

  return (
    <div className="bg-slate-900/50 border-slate-800 rounded-xl p-6 backdrop-blur-xl border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Cidade</label>
          <select name="city" value={filters.city || ''} onChange={handleChange} className="w-full bg-slate-800/50 border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
            <option value="">Todas cidades</option>
            <option value="São Paulo">São Paulo</option>
            <option value="Rio de Janeiro">Rio de Janeiro</option>
            <option value="Belo Horizonte">Belo Horizonte</option>
            <option value="Brasília">Brasília</option>
            <option value="Salvador">Salvador</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Idade</label>
          <input type="range" name="minAge" min="18" max="99" value={String(filters.minAge || 18)} onChange={handleChange} className="w-full accent-cyan-500" />
          <span className="text-xs text-slate-400 mt-1">{filters.minAge || 18}+</span>
          <span className="text-xs text-slate-400 ms-2">{filters.maxAge || 99}-</span>
          <span className="text-xs text-slate-400 ms-2">99</span>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Plano</label>
          <select name="plan" value={filters.plan || ''} onChange={handleChange} className="w-full bg-slate-800/50 border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
            <option value="">Todos planos</option>
            <option value="Individual">Individual</option>
            <option value="Empresarial">Empresarial</option>
            <option value="Grupo">Grupo</option>
          </select>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-800/50">
        <button onClick={() => onFiltersChange(filters)} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/30">
          Aplicar Filtros
        </button>
      </div>
    </div>
  )
}