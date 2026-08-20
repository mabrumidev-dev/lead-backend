import { useState, useEffect } from 'react'
import { Search, Users, Send, LogOut, Shield, Target, Database, Bell, User, Heart, Stethoscope, Plus, Activity, ShieldCheck, Building2, FileText, Upload, Map } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { useBaseLeads } from '@/hooks/useBaseLeads'
import { LeadsFilters } from '@/components/leads/LeadsFilters'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadsBaseTable } from '@/components/leads/LeadsBaseTable'
import { LeadsDispatchWhatsApp } from '@/components/leads/LeadsDispatchWhatsApp'
import { ImportLeads } from '@/components/leads/ImportLeads'
import { GoogleMapsScraper } from '@/components/leads/GoogleMapsScraper'
import { supabase } from '@/hooks/useLeads'
import { Lead, FilterOptions, INITIAL_FILTERS } from '@/types/lead'

const LogoIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#00BFFF', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#0077FF', stopOpacity:1}} />
      </linearGradient>
    </defs>
    <path d="M5 5 L10 2.5 L15 5 L15 10 L10 12.5 L5 10 Z" fill="url(#grad1)"/>
    <path d="M17.5 5 L22.5 2.5 L27.5 5 L27.5 10 L22.5 12.5 L17.5 10 Z" fill="url(#grad1)" opacity="0.7"/>
    <path d="M5 17.5 L10 15 L15 17.5 L15 22.5 L10 25 L5 22.5 Z" fill="url(#grad1)" opacity="0.7"/>
    <path d="M17.5 17.5 L22.5 15 L27.5 17.5 L27.5 22.5 L22.5 25 L17.5 25 Z" fill="url(#grad1)"/>
  </svg>
)

const LogoHeader = () => (
  <div className="absolute top-6 left-6 flex items-center gap-3 z-30">
    <LogoIcon className="w-10 h-10" />
    <div>
      <h1 className="text-xl font-bold text-white tracking-[2px]">MABRUMI</h1>
      <p className="text-[10px] text-slate-400 tracking-[1px]">CORRETORA DE SEGURO</p>
    </div>
  </div>
)

function FloatingIcon({ icon: Icon, style, delay, scrollY }: { icon: any; style: Record<string, any>; delay: number; scrollY: number }) {
  const mergedStyle = {
    ...style,
    animationDelay: `${delay}s`,
    transform: `translateY(${scrollY * 0.3}px)`
  }
  return (
    <div 
      className="absolute animate-float pointer-events-none"
      style={mergedStyle}
    >
      <Icon size={52} className="text-cyan-400/35 drop-shadow-[0_0_18px_rgba(0,212,255,0.35)]" strokeWidth={1.5} />
    </div>
  )
}

function ParallaxBackground({ scrollY }: { scrollY: number }) {
  const icons = [
    { icon: Heart, style: { top: '8%', left: '4%' }, delay: 0 },
    { icon: ShieldCheck, style: { top: '10%', right: '5%' }, delay: 0.5 },
    { icon: Plus, style: { bottom: '8%', left: '6%' }, delay: 3 },
    { icon: FileText, style: { bottom: '10%', right: '7%' }, delay: 1.5 },
    { icon: Stethoscope, style: { top: '35%', left: '12%' }, delay: 2 },
    { icon: Building2, style: { top: '60%', left: '8%' }, delay: 4 },
    { icon: Building2, style: { top: '30%', right: '12%' }, delay: 2.5 },
    { icon: Shield, style: { top: '65%', right: '9%' }, delay: 3.5 },
    { icon: Target, style: { top: '5%', left: '50%', marginLeft: '-26px' }, delay: 1 },
    { icon: Database, style: { bottom: '6%', left: '50%', marginLeft: '-26px' }, delay: 2 },
    { icon: Activity, style: { top: '45%', left: '22%' }, delay: 1.2 },
    { icon: Heart, style: { top: '50%', right: '20%' }, delay: 2.8 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(0,119,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,119,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      />
      <div 
        className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-[180px]"
        style={{ transform: `translateY(${scrollY * 0.4}px)` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-400/20 rounded-full blur-[180px]"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      />
      {icons.map((item, i) => (
        <FloatingIcon key={i} {...item} scrollY={scrollY} />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(25px, -25px) rotate(4deg); }
          50% { transform: translate(-20px, 20px) rotate(-4deg); }
          75% { transform: translate(15px, -15px) rotate(2deg); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <div className="min-h-screen bg-[#050A1A] flex items-center justify-center p-4 relative overflow-hidden">
      <ParallaxBackground scrollY={scrollY} />
      <LogoHeader />
      <div className="w-full max-w-lg relative z-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Plataforma de Captação e Enriquecimento de Leads</h2>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">Para Corretores de Seguros</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">Encontre, qualifique e dispare WhatsApp em massa. Transforme dados em vendas e enriqueça seu CRM em 1 clique.</p>
        <div className="bg-slate-900/60 border-slate-800 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl shadow-blue-500/10 text-left">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800/50 border-slate-700 rounded-lg px-4 py-3 text-white mb-4 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"/>
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800/50 border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"/>
          <button onClick={() => onLogin(email, password)} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/30">Acessar Plataforma</button>
          <p className="text-xs text-slate-500 mt-4 text-center">Demo: corretor@mabrumi.com / 123456</p>
        </div>
      </div>
    </div>
  )
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }

let toastId = 0

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-xl text-sm font-medium animate-slide-in flex items-center gap-2 ${
            t.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            t.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [isLogged, setIsLogged] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'buscar' | 'base' | 'disparo' | 'importar' | 'scraper'>('buscar')
  const [activeFiltersState, setActiveFiltersState] = useState<FilterOptions>(INITIAL_FILTERS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const { leads, loading, error, refetch, deleteLead, deleteMultipleLeads } = useLeads(activeFiltersState)
  const { baseLeads, addLeadToBase, removeLeadFromBase, updateLeadStatus } = useBaseLeads(userId)

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      if (data.session) {
        setIsLogged(true)
        setUserId(data.session.user.id)
      }
    })
  }, [])

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setIsLogged(true)
      setUserId(data.user.id)
    } catch (err: any) {
      showToast('Erro no login: ' + (err.message || 'Credenciais inválidas'), 'error')
    }
  }

  const handleAddToBase = (lead: Lead) => {
    addLeadToBase(lead)
    showToast(`${lead.name} adicionado à base!`, 'success')
  }

  const handleRemoveFromBase = (leadId: string) => {
    const lead = baseLeads.find(l => l.id === leadId)
    removeLeadFromBase(leadId)
    showToast(`${lead?.name || 'Lead'} removido da base`, 'info')
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId)
      showToast('Lead excluido!', 'success')
    } catch (err: any) {
      showToast('Erro ao excluir: ' + (err.message || 'Desconhecido'), 'error')
    }
  }

  const handleDeleteMultipleLeads = async (ids: string[]) => {
    try {
      await deleteMultipleLeads(ids)
      showToast(`${ids.length} lead(s) excluido(s)!`, 'success')
    } catch (err: any) {
      showToast('Erro ao excluir: ' + (err.message || 'Desconhecido'), 'error')
    }
  }

  const getTabContent = () => {
    if (activeTab === 'buscar') {
      return (
        <div>
          <LeadsFilters
            initialFilters={INITIAL_FILTERS}
            onFiltersChange={setActiveFiltersState}
          />
          <LeadsTable
            leads={leads}
            loading={loading}
            error={error}
            refetch={refetch}
            onAddToBase={handleAddToBase}
            onDelete={handleDeleteLead}
            onDeleteMultiple={handleDeleteMultipleLeads}
            baseLeadIds={baseLeads.map(l => l.id)}
          />
        </div>
      )
    }
    if (activeTab === 'base') {
      return (
        <LeadsBaseTable
          leads={baseLeads as Lead[]}
          onStatusChange={(leadId, newStatus) => updateLeadStatus(leadId, newStatus)}
          onRemoveFromBase={handleRemoveFromBase}
        />
      )
    }
    if (activeTab === 'disparo') {
      return (
        <LeadsDispatchWhatsApp
          leads={baseLeads as Lead[]}
          onClose={() => setActiveTab('base')}
          onStatusChange={(leadId, newStatus) => updateLeadStatus(leadId, newStatus)}
          onRemoveFromBase={handleRemoveFromBase}
        />
      )
    }
    if (activeTab === 'importar') {
      return (
        <ImportLeads
          onImportComplete={(importedLeads) => {
            showToast(`${importedLeads.length} leads importados com sucesso!`, 'success')
            refetch()
            setActiveTab('buscar')
          }}
          onBack={() => setActiveTab('buscar')}
        />
      )
    }
    if (activeTab === 'scraper') {
      return (
        <GoogleMapsScraper
          onImportComplete={(importedLeads) => {
            showToast(`${importedLeads.length} leads importados do Google Maps!`, 'success')
            refetch()
            setActiveTab('buscar')
          }}
        />
      )
    }
    return null
  }

  if (!isLogged) {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
        <Login onLogin={handleLogin} />
      </>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <div className="flex min-h-screen bg-[#050A1A] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,119,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,119,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <aside className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-col backdrop-blur-xl z-10">
          <div className="flex items-center gap-3 mb-10">
            <LogoIcon className="w-10 h-10" />
            <div><h1 className="font-bold text-lg tracking-wider">MABRUMI</h1><p className="text-xs text-slate-400">CORRETORA</p></div>
          </div>
          <nav className="flex-1 space-y-2">
            <button 
              onClick={() => setActiveTab('buscar')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'buscar' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              <Search size={18} /> Buscar Leads
            </button>
            <button 
              onClick={() => setActiveTab('base')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'base' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              <Users size={18} /> Base de Leads
              {baseLeads.length > 0 && (
                <span className="ml-auto bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full">{baseLeads.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('disparo')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'disparo' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              <Send size={18} /> Disparo WhatsApp
            </button>
            <div className="border-t border-slate-800 my-2" />
            <button 
              onClick={() => setActiveTab('scraper')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'scraper' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-l-4 border-green-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              <Map size={18} /> Google Maps
            </button>
            <button 
              onClick={() => setActiveTab('importar')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'importar' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              <Upload size={18} /> Importar CSV
            </button>
          </nav>
          <button onClick={() => { supabase.auth.signOut(); setIsLogged(false); setUserId(null) }} className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><LogOut size={18} /> Sair</button>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto z-10">
          <div className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold">Olá, Corretor 👋</h1><p className="text-slate-400">Bem-vindo ao seu painel de inteligência comercial</p></div>
            <div className="flex items-center gap-4"><Bell className="text-slate-400 hover:text-white cursor-pointer" /><div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg"><User size={18}/> <span>Admin</span></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/50 border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition backdrop-blur-xl"><Database className="text-cyan-400 mb-3" size={24}/><p className="text-slate-400 text-sm">Leads na Base</p><p className="text-4xl font-bold mt-2">{baseLeads.length}</p><p className="text-xs text-slate-500 mt-1">{leads.length} disponíveis</p></div>
            <div className="bg-slate-900/50 border-slate-800 rounded-xl p-6 hover:border-green-500/50 transition backdrop-blur-xl"><Shield className="text-green-400 mb-3" size={24}/><p className="text-slate-400 text-sm">Qualificados</p><p className="text-4xl font-bold mt-2">{baseLeads.filter(l => l.status === 'qualified').length}</p><p className="text-xs text-slate-500 mt-1">de {baseLeads.length} na base</p></div>
            <div className="bg-slate-900/50 border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition backdrop-blur-xl"><Target className="text-purple-400 mb-3" size={24}/><p className="text-slate-400 text-sm">Contactados</p><p className="text-4xl font-bold mt-2">{baseLeads.filter(l => l.status === 'contacted').length}</p><p className="text-xs text-slate-500 mt-1">disparos realizados</p></div>
          </div>
          <div className="bg-slate-900/50 border-slate-800 rounded-xl p-8 backdrop-blur-xl">
            {getTabContent()}
          </div>
        </main>
      </div>
    </>
  )
}

export function RootApp() {
  return (
    <div>
      <App />
    </div>
  )
}
