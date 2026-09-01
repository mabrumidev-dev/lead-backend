import { useState } from 'react'
import { Filter, Search, ChevronDown } from 'lucide-react'
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
      setFilters(prev => ({ ...prev, [name]: value }))
    }
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-5">
        <Filter size={16} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Cidade</label>
          <select name="city" value={filters.city || ''} onChange={handleChange} className="input-field">
            <option value="">Todas as cidades</option>
            <option value="São Paulo">São Paulo</option>
            <option value="Rio de Janeiro">Rio de Janeiro</option>
            <option value="Belo Horizonte">Belo Horizonte</option>
            <option value="Brasília">Brasília</option>
            <option value="Salvador">Salvador</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
            Idade: {filters.minAge || 18} — {filters.maxAge || 99}
          </label>
          <div className="flex gap-3 items-center">
            <input type="range" name="minAge" min="18" max="99" value={String(filters.minAge || 18)} onChange={handleChange} className="flex-1 accent-cyan-500" />
            <input type="range" name="maxAge" min="18" max="99" value={String(filters.maxAge || 99)} onChange={handleChange} className="flex-1 accent-cyan-500" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Plano</label>
          <select name="plan" value={filters.plan || ''} onChange={handleChange} className="input-field">
            <option value="">Todos os planos</option>
            <option value="Individual">Individual</option>
            <option value="Empresarial">Empresarial</option>
            <option value="Grupo">Grupo</option>
          </select>
        </div>
      </div>

      <button onClick={() => onFiltersChange(filters)} className="btn-primary w-full flex items-center justify-center gap-2">
        <Search size={16} />
        Aplicar Filtros
      </button>
    </div>
  )
}
