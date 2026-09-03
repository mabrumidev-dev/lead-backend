import { useState, useEffect, Component, type ReactNode } from 'react'
import { Search, Users, Send, LogOut, Shield, Target, Database, Heart, Stethoscope, Plus, Activity, ShieldCheck, Building2, FileText, Upload, Map, Menu, X, BarChart3, TrendingUp, UserCheck, PhoneCall, ChevronRight, Zap, Globe, FileSpreadsheet, Printer } from 'lucide-react'
import { useLeads } from './hooks/useLeads'
import { useBaseLeads } from './hooks/useBaseLeads'
import { LeadsFilters } from './components/leads/LeadsFilters'
import { LeadsTable } from './components/leads/LeadsTable'
import { LeadsBaseTable } from './components/leads/LeadsBaseTable'
import { LeadsDispatchWhatsApp } from './components/leads/LeadsDispatchWhatsApp'
import { ImportLeads } from './components/leads/ImportLeads'
import { GoogleMapsScraper } from './components/leads/GoogleMapsScraper'
import { VisionUpload } from './components/leads/vision/VisionUpload'
import { supabase } from './hooks/useLeads'
import { FilterOptions, INITIAL_FILTERS } from './types/lead'

// ═══════════════════════════════════════════════════════
// MABRUMI CRM PRO — Premium Dashboard
// ═══════════════════════════════════════════════════════

const Logo = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#logoGrad)" opacity="0.15" />
    <rect x="2" y="2" width="36" height="36" rx="10" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
    <path d="M12 28V14l4 8 4-8v14" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="28" cy="18" r="4" stroke="url(#logoGrad)" strokeWidth="2" fill="none" />
    <path d="M28 22v6" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// ═══ Animated Background Particles ═══
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)',
        backgroundSize: '80px 80px'
      }} />
      {/* Glow orbs */}
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] bg-cyan-500/[0.07] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-500/[0.05] rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[100px]" />
    </div>
  )
}

// ═══ Login Page ═══
function Login({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email.trim()) { setError('Informe o email'); return }
    if (!password.trim()) { setError('Informe a senha'); return }
    setLoading(true)
    onLogin(email, password)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg-primary)' }}>
      <ParticleField />
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <Logo size={56} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="gradient-text">MABRUMI</span>
          </h1>
          <p className="text-sm text-slate-500 tracking-wide uppercase">Corretora de Seguros — CRM Pro</p>
        </div>

        {/* Login Card */}
        <div className="glass p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2 animate-scale-in">
              <X size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="input-field"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Zap size={16} />
                Acessar Plataforma
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Mabrumi CRM Pro v2.0 — Inteligência em Seguros
        </p>
      </div>
    </div>
  )
}

// ═══ Error Boundary ═══
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
          <div className="text-center glass p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
              <X size={32} className="text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Algo deu errado</h2>
            <p className="text-slate-400 text-sm mb-6">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ═══ Toast System ═══
function ToastContainer({ toasts, onRemove }: { toasts: any[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`glass-sm px-4 py-3 text-sm font-medium animate-slide-in-right flex items-center gap-3 min-w-[280px] ${
            t.type === 'success' ? 'border-emerald-500/30 text-emerald-400' :
            t.type === 'error' ? 'border-rose-500/30 text-rose-400' :
            'border-slate-700 text-slate-300'
          }`}
        >
          {t.type === 'success' ? <ShieldCheck size={16} /> : t.type === 'error' ? <X size={16} /> : <Zap size={16} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-slate-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ═══ Dashboard KPIs ═══
function DashboardKPIs({ leads, baseLeads }: { leads: any[]; baseLeads: any[] }) {
  const totalLeads = leads.length
  const totalBase = baseLeads.length
  const qualified = leads.filter(l => l.status === 'qualified').length
  const contacted = leads.filter(l => l.status === 'contacted').length
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((a, l) => a + (l.score || 0), 0) / leads.length) : 0
  const cities = new Set(leads.map(l => l.city).filter(Boolean)).size

  const kpis = [
    { label: 'Total de Leads', value: totalLeads, icon: Database, color: 'cyan', trend: '+12%' },
    { label: 'Na Base', value: totalBase, icon: Users, color: 'blue', trend: null },
    { label: 'Qualificados', value: qualified, icon: UserCheck, color: 'emerald', trend: '+8%' },
    { label: 'Contactados', value: contacted, icon: PhoneCall, color: 'amber', trend: null },
    { label: 'Score Médio', value: `${avgScore}%`, icon: TrendingUp, color: 'indigo', trend: '+5%' },
    { label: 'Cidades', value: cities, icon: Globe, color: 'purple', trend: null },
  ]

  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={`kpi-card animate-fade-in stagger-${i + 1}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[kpi.color]} flex items-center justify-center border`}>
              <kpi.icon size={18} />
            </div>
            {kpi.trend && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {kpi.trend}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
          <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider">{kpi.label}</p>
        </div>
      ))}
    </div>
  )
}

// ═══ Sidebar Navigation ═══
type Tab = 'dashboard' | 'buscar' | 'base' | 'disparo' | 'importar' | 'scraper'

const NAV_ITEMS: { tab: Tab; label: string; icon: any; section?: string }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: BarChart3, section: 'principal' },
  { tab: 'buscar', label: 'Buscar Leads', icon: Search, section: 'principal' },
  { tab: 'base', label: 'Base de Leads', icon: Users, section: 'principal' },
  { tab: 'disparo', label: 'Disparo WhatsApp', icon: Send, section: 'principal' },
  { tab: 'scraper', label: 'Google Maps', icon: Map, section: 'ferramentas' },
  { tab: 'importar', label: 'Importar CSV', icon: Upload, section: 'ferramentas' },
]

function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, onLogout }: {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onLogout: () => void
}) {
  const sections = ['principal', 'ferramentas']
  
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col transform transition-transform duration-300 ease-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}>
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="font-bold text-[15px] tracking-tight text-white">MABRUMI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">CRM Pro</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {sections.map(section => (
            <div key={section} className="mb-4">
              <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {section === 'principal' ? 'Principal' : 'Ferramentas'}
              </p>
              {NAV_ITEMS.filter(item => item.section === section).map(item => {
                const isActive = activeTab === item.tab
                return (
                  <button
                    key={item.tab}
                    onClick={() => { setActiveTab(item.tab); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-cyan-500/50" />}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all border border-transparent hover:border-rose-500/20"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// ═══ Dashboard View ═══
function DashboardView({ leads, baseLeads, setActiveTab }: { leads: any[]; baseLeads: any[]; setActiveTab: (tab: Tab) => void }) {
  const recentLeads = leads.slice(0, 5)
  const statusCounts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
  }
  const total = statusCounts.new + statusCounts.contacted + statusCounts.qualified || 1

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Visão geral do seu CRM de seguros</p>
      </div>

      <DashboardKPIs leads={leads} baseLeads={baseLeads} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">Distribuição por Status</h3>
          <div className="space-y-4">
            {[
              { label: 'Novos', count: statusCounts.new, color: 'bg-rose-500', textColor: 'text-rose-400' },
              { label: 'Contactados', count: statusCounts.contacted, color: 'bg-amber-500', textColor: 'text-amber-400' },
              { label: 'Qualificados', count: statusCounts.qualified, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${item.color}`} style={{ width: `${(item.count / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">Ações Rápidas</h3>
          <div className="space-y-3">
            {[
              { label: 'Buscar novos leads', icon: Search, tab: 'buscar' as Tab, color: 'cyan' },
              { label: 'Google Maps Scraper', icon: Map, tab: 'scraper' as Tab, color: 'emerald' },
              { label: 'Importar CSV', icon: Upload, tab: 'importar' as Tab, color: 'blue' },
              { label: 'Disparo WhatsApp', icon: Send, tab: 'disparo' as Tab, color: 'amber' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => setActiveTab(action.tab)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-all group border border-transparent hover:border-slate-700"
              >
                <div className={`w-9 h-9 rounded-lg bg-${action.color}-500/10 border border-${action.color}-500/20 flex items-center justify-center`}>
                  <action.icon size={16} className={`text-${action.color}-400`} />
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Leads Recentes</h3>
            <button onClick={() => setActiveTab('buscar')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Ver todos →
            </button>
          </div>
          {recentLeads.length > 0 ? (
            <div className="space-y-2">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                    {(lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{lead.name || 'Sem nome'}</p>
                    <p className="text-[11px] text-slate-500">{lead.city || 'Sem cidade'}</p>
                  </div>
                  <span className={`badge ${
                    lead.status === 'qualified' ? 'badge-emerald' :
                    lead.status === 'contacted' ? 'badge-amber' : 'badge-rose'
                  }`}>
                    {lead.status === 'new' ? 'Novo' : lead.status === 'contacted' ? 'Contato' : 'Qualificado'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database size={32} className="mx-auto text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">Nenhum lead ainda</p>
              <button onClick={() => setActiveTab('buscar')} className="btn-ghost mt-3 text-xs">
                Buscar leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ Main App ═══
function App() {
  const [isLogged, setIsLogged] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [activeFiltersState, setActiveFiltersState] = useState<FilterOptions>(INITIAL_FILTERS)
  const [toasts, setToasts] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { leads, loading, error, refetch, deleteLead, deleteMultipleLeads, restoreLead, fetchDeleted, hardDeleteLead } = useLeads(activeFiltersState)
  const { baseLeads, addLeadToBase, removeLeadFromBase, updateLeadStatus } = useBaseLeads(userId)
  const [deletedLeads, setDeletedLeads] = useState<any[]>([])
  const [showTrash, setShowTrash] = useState(false)
  const [viewBaseLead, setViewBaseLead] = useState<any>(null)

  const showToast = (message: string, type: any = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) { setIsLogged(true); setUserId(data.session.user.id) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { setIsLogged(false); setUserId(null) }
      if (event === 'SIGNED_IN' && session) { setIsLogged(true); setUserId(session.user.id) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) showToast(error.message, 'error')
    else { setIsLogged(true); setUserId(data.user.id); showToast('Bem-vindo!', 'success') }
  }

  const handleLogout = () => { supabase.auth.signOut(); setIsLogged(false) }
  const handleAddToBase = (lead: any) => { addLeadToBase(lead); showToast(`${lead.name} adicionado à base!`, 'success') }
  const handleDeleteLead = async (id: string) => { await deleteLead(id); showToast('Lead excluído', 'success') }
  const handleDeleteMultipleLeads = async (ids: string[]) => { await deleteMultipleLeads(ids); showToast(`${ids.length} leads excluídos`, 'success') }
  const handleRestoreLead = async (id: string) => { await restoreLead(id); setDeletedLeads(prev => prev.filter(l => l.id !== id)); showToast('Lead restaurado!', 'success'); refetch() }
  const handleHardDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Excluir DEFINITIVAMENTE "${name}"? Esta ação não pode ser desfeita.`)) return
    try { await hardDeleteLead(id); setDeletedLeads(prev => prev.filter(l => l.id !== id)); showToast('Lead excluído permanentemente', 'success') } catch (e) { showToast('Erro ao excluir', 'error') }
  }
  const handleRescraper = (lead: any) => {
    setShowTrash(false)
    setActiveTab('scraper')
    // Store the lead name for the scraper to pick up
    sessionStorage.setItem('rescraper_name', lead.name || '')
    sessionStorage.setItem('rescraper_cnpj', lead.cnpj || lead.enriched_data?.CNPJ || '')
  }
  const handleOpenTrash = async () => { try { const deleted = await fetchDeleted(); setDeletedLeads(deleted); setShowTrash(true) } catch (e) { showToast('Erro ao carregar lixeira', 'error') } }

  const handleReenrich = (selectedLeads: any[]) => {
    const queue = selectedLeads.map(l => ({
      name: l.name || l.nome || '',
      cnpj: l.cnpj || l.enriched_data?.CNPJ || '',
      id: l.id
    }))
    sessionStorage.setItem('reenrich_queue', JSON.stringify(queue))
    setActiveTab('scraper')
    showToast(`${selectedLeads.length} leads enviados para re-enriquecimento`, 'success')
  }

  const handleVisionData = (data: any) => {
    if (data) {
      addLeadToBase({
        id: crypto.randomUUID(),
        name: data.name || '',
        email: data.email || '',
        phone: '',
        age: null,
        city: data.city || '',
        plan: 'Individual',
        status: 'new',
        score: 70,
        source: 'IA Vision',
        created_at: new Date().toISOString()
      })
      showToast('Lead extraído pela IA!', 'success')
    }
  }

  const getTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView leads={leads} baseLeads={baseLeads} setActiveTab={setActiveTab} />
      case 'buscar':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Buscar Leads</h2>
              <p className="text-sm text-slate-500 mt-1">Encontre e gerencie seus leads de seguros</p>
            </div>
            <LeadsFilters initialFilters={INITIAL_FILTERS} onFiltersChange={setActiveFiltersState} />
            <div className="glass-sm p-4">
              <VisionUpload onDataExtracted={handleVisionData} />
            </div>
            <LeadsTable
              leads={leads} loading={loading} error={error} refetch={refetch}
              onAddToBase={handleAddToBase} onDelete={handleDeleteLead}
              onDeleteMultiple={handleDeleteMultipleLeads} onReenrich={handleReenrich}
              baseLeadIds={baseLeads.map(l => l.id)}
            />
          </div>
        )
      case 'base':
        return (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Base de Leads</h2>
                <p className="text-sm text-slate-500 mt-1">Seus leads salvos para contato</p>
              </div>
              <button onClick={handleOpenTrash} className="btn-ghost flex items-center gap-2 px-3 py-2 text-sm">
                <span>🗑️</span>
                <span>Lixeira</span>
              </button>
            </div>
            <LeadsBaseTable leads={baseLeads as any} onStatusChange={(id, s) => updateLeadStatus(id, s)} onRemoveFromBase={removeLeadFromBase} onViewLead={setViewBaseLead} />
          </div>
        )
      case 'disparo':
        return (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Disparo WhatsApp</h2>
              <p className="text-sm text-slate-500 mt-1">Envie mensagens personalizadas em massa</p>
            </div>
            <LeadsDispatchWhatsApp leads={baseLeads as any} onClose={() => setActiveTab('base')} onStatusChange={(id, s) => updateLeadStatus(id, s)} onRemoveFromBase={removeLeadFromBase} />
          </div>
        )
      case 'importar':
        return (
          <div className="animate-fade-in">
            <ImportLeads onImportComplete={() => { showToast('Importado com sucesso!', 'success'); refetch(); setActiveTab('buscar') }} onBack={() => setActiveTab('buscar')} />
          </div>
        )
      case 'scraper':
        return (
          <div className="animate-fade-in">
            <GoogleMapsScraper onImportComplete={() => { showToast('Importado com sucesso!', 'success'); refetch(); setActiveTab('buscar') }} showToast={showToast} />
          </div>
        )
      default:
        return null
    }
  }

  // Trash modal
  const TrashModal = () => {
    if (!showTrash) return null
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setShowTrash(false)}>
        <div className="glass w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗑️</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Lixeira</h2>
                  <p className="text-xs text-slate-500">{deletedLeads.length} lead(s) excluído(s)</p>
                </div>
              </div>
              <button onClick={() => setShowTrash(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {deletedLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Lixeira vazia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deletedLeads.map(lead => (
                  <div key={lead.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/20 flex items-center justify-center text-sm font-bold text-slate-400">
                      {(lead.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{lead.name}</p>
                      <p className="text-[11px] text-slate-500">{lead.phone || 'Sem telefone'} • {lead.city || 'Sem cidade'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreLead(lead.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => handleRescraper(lead)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-xs font-medium"
                        title="Re-buscar no Google Maps Scraper"
                      >
                        Re-buscar
                      </button>
                      <button
                        onClick={() => handleHardDeleteLead(lead.id, lead.name)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-medium"
                        title="Excluir permanentemente"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Base lead detail modal — formato limpo (grid 2 colunas)
  const BaseLeadDetailModal = () => {
    if (!viewBaseLead) return null
    const lead = viewBaseLead
    const enriched = lead.enriched_data || {}
    const social = enriched.SocialMedia || {}
    const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)

    const fmtCNPJ = (v: string) => {
      if (!v) return ''
      const d = v.replace(/\D/g, '')
      if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
      return v
    }
    const fmtCurrency = (v: any) => {
      if (v === null || v === undefined || v === '') return ''
      return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }

    const mainFields = [
      { label: 'TELEFONE', value: lead.phone || lead.telefone },
      { label: 'EMAIL', value: lead.email || enriched.Email || null },
      { label: 'CIDADE', value: lead.city || lead.cidade },
      { label: 'PLANO', value: lead.plan || lead.nicho },
      { label: 'SCORE', value: lead.score ? `${lead.score}%` : null },
      { label: 'STATUS', value: lead.status === 'new' ? 'Novo' : lead.status === 'contacted' ? 'Contactado' : lead.status === 'qualified' ? 'Qualificado' : lead.status },
    ]

    const bizFields = enriched.CNPJ ? [
      { label: 'CNPJ', value: fmtCNPJ(enriched.CNPJ) },
      { label: 'RAZÃO SOCIAL', value: enriched.RazaoSocial },
      { label: 'NOME FANTASIA', value: enriched.NomeFantasia },
      { label: 'RESPONSÁVEL', value: enriched.Responsavel },
      { label: 'NATUREZA JURÍDICA', value: enriched.NaturezaJuridica },
      { label: 'PORTE', value: enriched.Porte },
      { label: 'CAPITAL SOCIAL', value: enriched.CapitalSocial ? fmtCurrency(enriched.CapitalSocial) : null },
      { label: 'ATIVIDADE PRINCIPAL', value: enriched.AtividadePrincipal },
      { label: 'CNAE FISCAL', value: enriched.CNAEFiscal ? String(enriched.CNAEFiscal) : null },
      { label: 'INÍCIO ATIVIDADE', value: enriched.DataInicioAtividade },
      { label: 'TIPO', value: enriched.IdentificadorMatrizFilial },
      { label: 'SIMPLES NACIONAL', value: enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : null },
      { label: 'MEI', value: enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : null },
      { label: 'WEBSITE', value: enriched.Website || lead.website, isLink: true },
      { label: 'SITUAÇÃO', value: enriched.SituacaoCadastral },
    ] : []

    const addrFields = (enriched.EnderecoCompleto || enriched.CEP || enriched.Municipio) ? [
      { label: 'ENDEREÇO', value: enriched.EnderecoCompleto },
      { label: 'CEP', value: enriched.CEP },
      { label: 'UF', value: enriched.UF },
      { label: 'MUNICÍPIO', value: enriched.Municipio },
      { label: 'BAIRRO', value: enriched.Bairro },
    ] : []

    const contactFields = (enriched.Telefone1 || enriched.Telefone2) ? [
      { label: 'TELEFONE 1', value: enriched.Telefone1 },
      { label: 'TELEFONE 2', value: enriched.Telefone2 },
    ] : []

    // Export functions
    const downloadCSV = () => {
      const h = ['Nome','Telefone','Email','Cidade','CNPJ','Razão Social','Nome Fantasia','Responsável','Porte','Atividade Principal','Website','Situação','Capital Social','Natureza Jurídica','CEP','UF','Município','Bairro','Endereço','Telefone 1','Telefone 2','CNAE Fiscal','Simples','MEI','QSA','Redes Sociais']
      const qsa = (enriched.QSA || []).map((s: any) => `${s.nome} (${s.qualificacao})`).join('; ')
      const socialStr = socialEntries.map(([k, v]: any) => `${k}: ${v.url}`).join('; ')
      const v = [lead.name || '', lead.phone || '', lead.email || '', lead.city || '', enriched.CNPJ || '', enriched.RazaoSocial || '', enriched.NomeFantasia || '', enriched.Responsavel || '', enriched.Porte || '', enriched.AtividadePrincipal || '', enriched.Website || '', enriched.SituacaoCadastral || '', enriched.CapitalSocial || '', enriched.NaturezaJuridica || '', enriched.CEP || '', enriched.UF || '', enriched.Municipio || '', enriched.Bairro || '', enriched.EnderecoCompleto || '', enriched.Telefone1 || '', enriched.Telefone2 || '', enriched.CNAEFiscal || '', String(enriched.OpcaoSimples ?? ''), String(enriched.OpcaoMEI ?? ''), qsa, socialStr]
      const csv = [h.join(','), v.map(x => `"${String(x).replace(/"/g, '""')}`)].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `lead-${(lead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url)
    }

    const downloadTXT = () => {
      const sep = '═'.repeat(56)
      const line = '─'.repeat(56)
      let txt = `\n${sep}\n  DADOS DO LEAD\n${sep}\n\n`
      txt += `Nome: ${lead.name}\nTelefone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nCidade: ${lead.city || 'N/A'}\nScore: ${lead.score || 0}%\nStatus: ${lead.status}\n`
      if (enriched.CNPJ) {
        txt += `\nDADOS EMPRESARIAIS\n${line}\n`
        txt += `CNPJ: ${fmtCNPJ(enriched.CNPJ)}\nRazão Social: ${enriched.RazaoSocial || 'N/A'}\nNome Fantasia: ${enriched.NomeFantasia || 'N/A'}\nResponsável: ${enriched.Responsavel || 'N/A'}\nPorte: ${enriched.Porte || 'N/A'}\nAtividade: ${enriched.AtividadePrincipal || 'N/A'}\nSituação: ${enriched.SituacaoCadastral || 'N/A'}\nCapital Social: ${fmtCurrency(enriched.CapitalSocial) || 'N/A'}\nNatureza Jurídica: ${enriched.NaturezaJuridica || 'N/A'}\nCNAE: ${enriched.CNAEFiscal || 'N/A'}\nSimples: ${enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : 'N/A'}\nMEI: ${enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : 'N/A'}\nWebsite: ${enriched.Website || lead.website || 'N/A'}\n`
        txt += `\nENDEREÇO\n${line}\n`
        txt += `Endereço: ${enriched.EnderecoCompleto || 'N/A'}\nCEP: ${enriched.CEP || 'N/A'}\nUF: ${enriched.UF || 'N/A'}\nMunicípio: ${enriched.Municipio || 'N/A'}\nBairro: ${enriched.Bairro || 'N/A'}\n`
        txt += `\nCONTATO\n${line}\n`
        txt += `Telefone 1: ${enriched.Telefone1 || 'N/A'}\nTelefone 2: ${enriched.Telefone2 || 'N/A'}\nEmail: ${enriched.Email || 'N/A'}\n`
      }
      if (enriched.QSA && enriched.QSA.length > 0) {
        txt += `\nQUADRO SOCIETÁRIO (${enriched.QSA.length})\n${line}\n`
        for (const s of enriched.QSA) txt += `• ${s.nome || s.Nome} — ${s.qualificacao || ''}\n`
      }
      if (enriched.RegimeTributario && enriched.RegimeTributario.length > 0) {
        txt += `\nREGIME TRIBUTÁRIO\n${line}\n`
        for (const r of enriched.RegimeTributario) txt += `• ${r}\n`
      }
      if (enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0) {
        txt += `\nCNAEs SECUNDÁRIOS\n${line}\n`
        for (const c of enriched.CnaesSecundarios) txt += `• ${c}\n`
      }
      if (enriched.HealthPlan) {
        txt += `\nPLANO DE SAÚDE\n${line}\n`
        txt += `Identificado: ${enriched.HealthPlan.tem_plano === true ? 'Sim' : enriched.HealthPlan.tem_plano === false ? 'Não' : 'Inconclusivo'}\nTipo: ${enriched.HealthPlan.tipo || 'N/A'}\nConfiança: ${enriched.HealthPlan.confianca || 'N/A'}\n`
      }
      if (enriched.EmployeeCount && enriched.EmployeeCount.fonte) {
        txt += `\nCOLABORADORES\n${line}\n`
        txt += `Quantidade: ${(enriched.EmployeeCount.funcionarios ?? enriched.EmployeeCount.faixa) || 'N/A'}\nFonte: ${enriched.EmployeeCount.fonte}\nConfiança: ${enriched.EmployeeCount.confianca || 'N/A'}\n`
      }
      if (socialEntries.length > 0) {
        txt += `\nREDES SOCIAIS\n${line}\n`
        for (const [p, d] of socialEntries) txt += `${p}: ${d.url}\n`
      }
      txt += `\n${sep}\n`
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `lead-${(lead.name || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}.txt`; a.click(); URL.revokeObjectURL(url)
    }

    const downloadPDF = () => {
      const qsaRows = (enriched.QSA || []).map((q: any) => `<tr><td>${q.nome || q.Nome || ''}</td><td>${q.qualificacao || ''}</td><td>${q.entrada || ''}</td><td>${q.faixa_etaria || ''}</td></tr>`).join('')
      const socialRows = socialEntries.map(([p, d]: any) => `<tr><td>${p}</td><td><a href="${d.url}">${d.url}</a></td></tr>`).join('')
      const regimeRows = (enriched.RegimeTributario || []).map((r: string) => `<li>${r}</li>`).join('')
      const cnaeRows = (enriched.CnaesSecundarios || []).map((c: string) => `<li>${c}</li>`).join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${lead.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1e293b;background:#fff}
  h1{color:#0891b2;font-size:22px;border-bottom:3px solid #0891b2;padding-bottom:8px;margin-bottom:20px}
  h2{color:#0e7490;font-size:15px;margin:20px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
  .field{margin:4px 0}
  .label{font-weight:700;color:#475569;font-size:12px;display:inline}
  .value{font-size:13px;color:#0f172a;display:inline;margin-left:4px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0}
  th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:11px;border:1px solid #e2e8f0}
  td{padding:5px 8px;border:1px solid #e2e8f0;font-size:11px}
  ul{margin:4px 0 4px 18px;font-size:12px}li{margin:2px 0}
  .footer{margin-top:30px;text-align:center;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:10px}
  @media print{body{padding:15px}}
</style></head><body>
<h1>${lead.name}</h1>
<h2>Dados Gerais</h2>
<div class="grid">
  <div class="field"><span class="label">Telefone:</span><span class="value">${lead.phone || 'N/A'}</span></div>
  <div class="field"><span class="label">Email:</span><span class="value">${lead.email || 'N/A'}</span></div>
  <div class="field"><span class="label">Cidade:</span><span class="value">${lead.city || 'N/A'}</span></div>
  <div class="field"><span class="label">Plano:</span><span class="value">${lead.plan || 'N/A'}</span></div>
  <div class="field"><span class="label">Score:</span><span class="value">${lead.score || 0}%</span></div>
  <div class="field"><span class="label">Status:</span><span class="value">${lead.status}</span></div>
</div>
${enriched.CNPJ ? `
<h2>Dados Empresariais</h2>
<div class="grid">
  <div class="field"><span class="label">CNPJ:</span><span class="value">${fmtCNPJ(enriched.CNPJ)}</span></div>
  <div class="field"><span class="label">Situação:</span><span class="value">${enriched.SituacaoCadastral || 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">Razão Social:</span><span class="value">${enriched.RazaoSocial || 'N/A'}</span></div>
  <div class="field"><span class="label">Nome Fantasia:</span><span class="value">${enriched.NomeFantasia || 'N/A'}</span></div>
  <div class="field"><span class="label">Responsável:</span><span class="value">${enriched.Responsavel || 'N/A'}</span></div>
  <div class="field"><span class="label">Porte:</span><span class="value">${enriched.Porte || 'N/A'}</span></div>
  <div class="field"><span class="label">Natureza Jurídica:</span><span class="value">${enriched.NaturezaJuridica || 'N/A'}</span></div>
  <div class="field"><span class="label">Capital Social:</span><span class="value">${fmtCurrency(enriched.CapitalSocial) || 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">Atividade Principal:</span><span class="value">${enriched.AtividadePrincipal || 'N/A'}</span></div>
  <div class="field"><span class="label">CNAE:</span><span class="value">${enriched.CNAEFiscal || 'N/A'}</span></div>
  <div class="field"><span class="label">Tipo:</span><span class="value">${enriched.IdentificadorMatrizFilial || 'N/A'}</span></div>
  <div class="field"><span class="label">Início Atividade:</span><span class="value">${enriched.DataInicioAtividade || 'N/A'}</span></div>
  <div class="field"><span class="label">Simples:</span><span class="value">${enriched.OpcaoSimples === true ? 'Sim' : enriched.OpcaoSimples === false ? 'Não' : 'N/A'}</span></div>
  <div class="field"><span class="label">MEI:</span><span class="value">${enriched.OpcaoMEI === true ? 'Sim' : enriched.OpcaoMEI === false ? 'Não' : 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">Website:</span><span class="value">${enriched.Website || lead.website || 'N/A'}</span></div>
</div>
<h2>Endereço</h2>
<div class="grid">
  <div class="field" style="grid-column:1/3"><span class="label">Logradouro:</span><span class="value">${enriched.EnderecoCompleto || 'N/A'}</span></div>
  <div class="field"><span class="label">CEP:</span><span class="value">${enriched.CEP || 'N/A'}</span></div>
  <div class="field"><span class="label">UF:</span><span class="value">${enriched.UF || 'N/A'}</span></div>
  <div class="field"><span class="label">Município:</span><span class="value">${enriched.Municipio || 'N/A'}</span></div>
  <div class="field"><span class="label">Bairro:</span><span class="value">${enriched.Bairro || 'N/A'}</span></div>
</div>
<h2>Contato</h2>
<div class="grid">
  <div class="field"><span class="label">Telefone 1:</span><span class="value">${enriched.Telefone1 || 'N/A'}</span></div>
  <div class="field"><span class="label">Telefone 2:</span><span class="value">${enriched.Telefone2 || 'N/A'}</span></div>
  <div class="field"><span class="label">Email:</span><span class="value">${enriched.Email || 'N/A'}</span></div>
</div>
${enriched.QSA && enriched.QSA.length > 0 ? `<h2>Quadro Societário (${enriched.QSA.length})</h2><table><tr><th>Nome</th><th>Qualificação</th><th>Entrada</th><th>Faixa Etária</th></tr>${qsaRows}</table>` : ''}
${enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0 ? `<h2>CNAEs Secundários</h2><ul>${cnaeRows}</ul>` : ''}
${enriched.RegimeTributario && enriched.RegimeTributario.length > 0 ? `<h2>Regime Tributário</h2><ul>${regimeRows}</ul>` : ''}
` : ''}
${socialEntries.length > 0 ? `<h2>Redes Sociais</h2><table><tr><th>Plataforma</th><th>URL</th></tr>${socialRows}</table>` : ''}
<div class="footer">Mabrumi CRM Pro — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`
      const win = window.open('', '_blank')
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
    }

    // Helper components
    const Field = ({ label, value, isLink }: { label: string; value: any; isLink?: boolean }) => {
      if (!value || value === '' || value === null || value === undefined) return null
      return (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
          {isLink ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all">{value}</a>
          ) : (
            <p className="text-sm text-white">{value}</p>
          )}
        </div>
      )
    }

    const Section = ({ title, fields }: { title: string; fields: { label: string; value: any; isLink?: boolean }[] }) => {
      const visible = fields.filter(f => f.value)
      if (visible.length === 0) return null
      return (
        <>
          <div className="border-t border-slate-700/50 my-4" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{title}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {visible.map(f => <Field key={f.label} {...f} />)}
          </div>
        </>
      )
    }

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewBaseLead(null)}>
        <div className="relative w-full max-w-2xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Close button */}
          <button onClick={() => setViewBaseLead(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10">
            <X size={18} />
          </button>

          <div className="p-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pr-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400">
                {(lead.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{lead.name || 'Lead'}</h2>
                {(enriched.Website || lead.website) ? (
                  <a href={enriched.Website || lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300">website</a>
                ) : (
                  <p className="text-xs text-slate-500">{lead.source || lead.fonte || 'Base'}</p>
                )}
              </div>
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {mainFields.filter(f => f.value).map(f => <Field key={f.label} {...f} />)}
            </div>

            {/* Seções adicionais */}
            <Section title="Dados Empresariais" fields={bizFields} />
            <Section title="Endereço" fields={addrFields} />
            <Section title="Contato Extra" fields={contactFields} />

            {/* QSA */}
            {enriched.QSA && enriched.QSA.length > 0 && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Quadro Societário ({enriched.QSA.length})</p>
                <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-700">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Nome</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Qualificação</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Faixa Etária</th>
                    </tr></thead>
                    <tbody>
                      {enriched.QSA.map((s: any, i: number) => (
                        <tr key={i} className="border-b border-slate-700/50 last:border-0">
                          <td className="px-3 py-2 text-white">{s.nome || s.Nome || ''}</td>
                          <td className="px-3 py-2 text-slate-300">{s.qualificacao || ''}</td>
                          <td className="px-3 py-2 text-slate-300">{s.entrada || ''}</td>
                          <td className="px-3 py-2 text-slate-300">{s.faixa_etaria || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Regime Tributário */}
            {enriched.RegimeTributario && enriched.RegimeTributario.length > 0 && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Regime Tributário</p>
                <div className="flex flex-wrap gap-1.5">
                  {enriched.RegimeTributario.map((r: string, i: number) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">{r}</span>
                  ))}
                </div>
              </>
            )}

            {/* CNAEs Secundários */}
            {enriched.CnaesSecundarios && enriched.CnaesSecundarios.length > 0 && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">CNAEs Secundários ({enriched.CnaesSecundarios.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {enriched.CnaesSecundarios.map((c: string, i: number) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[11px] border border-slate-600/30">{c}</span>
                  ))}
                </div>
              </>
            )}

            {/* Plano de Saúde */}
            {enriched.HealthPlan && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Plano de Saúde</p>
                <div className={`p-3 rounded-xl border ${enriched.HealthPlan.tem_plano === true ? 'bg-emerald-500/10 border-emerald-500/25' : enriched.HealthPlan.tem_plano === null ? 'bg-amber-500/10 border-amber-500/25' : 'bg-slate-700/30 border-slate-600/30'}`}>
                  <p className={`text-sm font-bold ${enriched.HealthPlan.tem_plano === true ? 'text-emerald-400' : enriched.HealthPlan.tem_plano === null ? 'text-amber-400' : 'text-slate-400'}`}>
                    {enriched.HealthPlan.tem_plano === true ? 'Identificado' : enriched.HealthPlan.tem_plano === null ? 'Inconclusivo' : 'Não Identificado'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Tipo: {enriched.HealthPlan.tipo || '-'} | Confiança: {enriched.HealthPlan.confianca || '-'}</p>
                  {enriched.HealthPlan.sinais && enriched.HealthPlan.sinais.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {enriched.HealthPlan.sinais.map((s: string, i: number) => <p key={i} className="text-[10px] text-slate-500">• {s}</p>)}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Colaboradores */}
            {enriched.EmployeeCount && enriched.EmployeeCount.fonte && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Colaboradores</p>
                <div className={`p-3 rounded-xl border ${enriched.EmployeeCount.funcionarios !== null ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-sky-500/10 border-sky-500/25'}`}>
                  <p className={`text-sm font-bold ${enriched.EmployeeCount.funcionarios !== null ? 'text-emerald-400' : 'text-sky-400'}`}>
                    {enriched.EmployeeCount.funcionarios !== null ? `${enriched.EmployeeCount.funcionarios.toLocaleString('pt-BR')} colaboradores` : `Faixa: ${enriched.EmployeeCount.faixa || '-'}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Fonte: {enriched.EmployeeCount.fonte} | Confiança: {enriched.EmployeeCount.confianca || '-'}</p>
                </div>
              </>
            )}

            {/* Redes Sociais */}
            {socialEntries.length > 0 && (
              <>
                <div className="border-t border-slate-700/50 my-4" />
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Redes Sociais</p>
                <div className="grid grid-cols-2 gap-2">
                  {socialEntries.map(([platform, data]: [string, any]) => (
                    <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:brightness-125 transition-all">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{platform}</span>
                      <span className="text-[11px] text-slate-400 truncate flex-1">{data.title || data.url}</span>
                      <span className="text-[10px] text-slate-500">↗</span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {/* Export */}
            <div className="border-t border-slate-700/50 mt-4 pt-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Exportar</p>
              <div className="flex gap-2">
                <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-xs font-medium">
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button onClick={downloadTXT} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 transition-colors text-xs font-medium">
                  <FileText size={14} /> TXT
                </button>
                <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600/20 border border-orange-600/30 text-orange-400 hover:bg-orange-600/30 transition-colors text-xs font-medium">
                  <Printer size={14} /> PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isLogged) return <Login onLogin={handleLogin} />

  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <TrashModal />
      <BaseLeadDetailModal />
      <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 px-5 py-4 flex items-center gap-4" style={{ background: 'rgba(6,8,15,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-cyan-400">C</span>
              </div>
              <span className="text-sm text-slate-400 hidden sm:block">Corretor</span>
            </div>
          </header>

          {/* Content */}
          <div className="p-5 lg:p-8">
            {getTabContent()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
