import { useState, useEffect, Component, type ReactNode } from 'react'
import { Search, Users, Send, LogOut, Shield, Target, Database, Heart, Stethoscope, Plus, Activity, ShieldCheck, Building2, FileText, Upload, Map, Menu, X, BarChart3, TrendingUp, UserCheck, PhoneCall, ChevronRight, Zap, Globe } from 'lucide-react'
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
  const { leads, loading, error, refetch, deleteLead, deleteMultipleLeads } = useLeads(activeFiltersState)
  const { baseLeads, addLeadToBase, removeLeadFromBase, updateLeadStatus } = useBaseLeads(userId)

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
              onDeleteMultiple={handleDeleteMultipleLeads} baseLeadIds={baseLeads.map(l => l.id)}
            />
          </div>
        )
      case 'base':
        return (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Base de Leads</h2>
              <p className="text-sm text-slate-500 mt-1">Seus leads salvos para contato</p>
            </div>
            <LeadsBaseTable leads={baseLeads as any} onStatusChange={(id, s) => updateLeadStatus(id, s)} onRemoveFromBase={removeLeadFromBase} />
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

  if (!isLogged) return <Login onLogin={handleLogin} />

  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
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
