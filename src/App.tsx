import { useState, useEffect, Component, type ReactNode } from 'react'
import { Search, Users, Send, LogOut, Shield, Target, Database, Heart, Stethoscope, Plus, Activity, ShieldCheck, Building2, FileText, Upload, Map, Menu, Trash2 } from 'lucide-react'
import { useLeads } from './hooks/useLeads'
import { useBaseLeads } from './hooks/useBaseLeads'
import { LeadsFilters } from './components/leads/LeadsFilters'
import { LeadsTable } from './components/leads/LeadsTable'
import { LeadsBaseTable } from './components/leads/LeadsBaseTable'
import { LeadsDispatchWhatsApp } from './components/leads/LeadsDispatchWhatsApp'
import { ImportLeads } from './components/leads/ImportLeads'
import { GoogleMapsScraper } from './components/leads/GoogleMapsScraper'
import { TrashView } from './components/leads/TrashView'
import { VisionUpload } from './components/leads/vision/VisionUpload'
import { supabase } from './hooks/useLeads'
import { FilterOptions, INITIAL_FILTERS } from './types/lead'

// --- Componentes de UI Auxiliares ---
const LogoIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%">
        <stop offset="0%" style={{stopColor:'#00BFFF', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#0077FF', stopOpacity:1}} />
      </linearGradient>
    </defs>
    <path d="M5 5 L10 2.5 L15 5 L15 10 L10 12.5 L5 10 Z" fill="url(#grad1)"/>
    <path d="M17.5 5 L22.5 2.5 L27.5 5 L27.5 10 L22.5 12.5 L17.5 10 Z" fill="url(#grad1)" opacity="0.7"/>
    <path d="M5 17.5 L10 15 L15 17.5 L15 22.5 L10 25 L5 22.5 Z" fill="url(#grad1)" opacity="0.7"/>
    <path d="M17.5 17.5 L22.5 15 L27.5 17.5 L27.5 22.5 L22.5 25 L17.5 25 Z" fill="url(#grad1)" opacity="0.7"/>
  </svg>
)

function FloatingIcon({ icon: Icon, style, delay, scrollY }: { icon: any; style: Record<string, any>; delay: number; scrollY: number }) {
  const mergedStyle = {
    ...style,
    animationDelay: `${delay}s`,
    transform: `translateY(${scrollY * 0.3}px)`
  }
  return (
    <div className="absolute animate-float pointer-events-none" style={mergedStyle}>
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,119,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,119,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" style={{ transform: `translateY(${scrollY * 0.2}px)` }} />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-[180px]" style={{ transform: `translateY(${scrollY * 0.4}px)` }} />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-400/20 rounded-full blur-[180px]" style={{ transform: `translateY(${scrollY * 0.15}px)` }} />
      {icons.map((item, i) => <FloatingIcon key={i} {...item} scrollY={scrollY} />)}
    </div>
  )
}

function Login({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  const handleSubmit = () => {
    setError('')
    if (!email.trim()) { setError('Informe o email'); return }
    if (!password.trim()) { setError('Informe a senha'); return }
    onLogin(email, password)
  }
  return (
    <div className="min-h-screen bg-[#050A1A] flex items-center justify-center p-4 relative overflow-hidden">
      <ParallaxBackground scrollY={scrollY} />
      <div className="w-full max-w-lg relative z-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">MABRUMI CRM</h2>
        <div className="bg-slate-900/60 border-slate-800 rounded-2xl p-8 backdrop-blur-2xl text-left">
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white mb-4 outline-none" />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white mb-6 outline-none" />
          <button onClick={handleSubmit} className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg">Acessar Plataforma</button>
        </div>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050A1A] flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Algo deu errado</h2>
            <p className="text-slate-400 mb-4">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="bg-cyan-500 text-white px-6 py-2 rounded-lg">Recarregar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ToastContainer({ toasts, onRemove }: { toasts: any[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-xl text-sm font-medium ${t.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-white border border-slate-700'}`}>
          {t.message}
          <button onClick={() => onRemove(t.id)} className="ml-2">×</button>
        </div>
      ))}
    </div>
  )
}

function App() {
  const [isLogged, setIsLogged] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'buscar' | 'base' | 'disparo' | 'importar' | 'scraper' | 'lixeira'>('buscar')
  const [activeFiltersState, setActiveFiltersState] = useState<FilterOptions>(INITIAL_FILTERS)
  const [toasts, setToasts] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { leads, loading, error, refetch, deleteLead, deleteMultipleLeads } = useLeads(activeFiltersState)
  const { baseLeads, trashedLeads, addLeadToBase, removeLeadFromBase, trashLead, restoreLead, permanentDelete, updateLeadStatus, reprocessLead } = useBaseLeads(userId)

  const showToast = (message: string, type: any = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) { setIsLogged(true); setUserId(data.session.user.id); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[AUTH] Token refreshed successfully')
      }
      if (event === 'SIGNED_OUT') {
        setIsLogged(false)
        setUserId(null)
      }
      if (event === 'SIGNED_IN' && session) {
        setIsLogged(true)
        setUserId(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
    else { setIsLogged(true); setUserId(data.user.id); }
  };

  const handleAddToBase = (lead: any) => { addLeadToBase(lead); showToast(`${lead.name} adicionado!`, 'success'); };
  const handleTrashLead = (id: string) => { trashLead(id); showToast('Movido para lixeira', 'info'); };
  const handleRestoreLead = (id: string) => { restoreLead(id); showToast('Lead restaurado!', 'success'); };
  const handlePermanentDelete = (id: string) => { permanentDelete(id); showToast('Excluído permanentemente', 'info'); };
  const handleReprocessLead = async (id: string): Promise<boolean> => {
    showToast('Re-processando lead... (CNPJ + redes sociais + plano de saúde)', 'info')
    const result = await reprocessLead(id)
    if (result.ok && result.found.length > 0) {
      showToast(`✅ Dados encontrados: ${result.found.join(' | ')}`, 'success')
    } else if (result.ok) {
      showToast('Re-processamento concluído (dados limitados)', 'info')
    } else {
      showToast(`❌ Erro: ${result.errors.join(' | ') || 'Nenhum dado encontrado para este lead'}`, 'error')
    }
    return result.ok
  }
  const handleDeleteLead = async (id: string) => { await deleteLead(id); showToast('Excluído', 'success'); };
  const handleDeleteMultipleLeads = async (ids: string[]) => { await deleteMultipleLeads(ids); showToast('Excluídos', 'success'); };

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
      });
      showToast("Lead extraído pela IA!", "success");
    }
  };

  const getTabContent = () => {
    if (activeTab === 'buscar') {
      return (
        <div className="space-y-4">
          <LeadsFilters initialFilters={INITIAL_FILTERS} onFiltersChange={setActiveFiltersState} />
          <div className="mt-4 mb-4">
            <VisionUpload onDataExtracted={handleVisionData} />
          </div>
          <LeadsTable
            leads={leads} loading={loading} error={error} refetch={refetch}
            onAddToBase={handleAddToBase} onDelete={handleDeleteLead}
            onDeleteMultiple={handleDeleteMultipleLeads} baseLeadIds={baseLeads.map(l => l.id)}
          />
        </div>
      );
    }
    if (activeTab === 'base') return <LeadsBaseTable leads={baseLeads as any} onStatusChange={(id, s) => updateLeadStatus(id, s)} onTrashLead={handleTrashLead} onReprocessLead={handleReprocessLead} />;
    if (activeTab === 'lixeira') return <TrashView trashedLeads={trashedLeads} onRestore={handleRestoreLead} onPermanentDelete={handlePermanentDelete} />;
    if (activeTab === 'disparo') return <LeadsDispatchWhatsApp leads={baseLeads as any} onClose={() => setActiveTab('base')} onStatusChange={(id, s) => updateLeadStatus(id, s)} onRemoveFromBase={handleTrashLead} />;
    if (activeTab === 'importar') return <ImportLeads onImportComplete={(_l) => { showToast('Importado!', 'success'); refetch(); setActiveTab('buscar'); }} onBack={() => setActiveTab('buscar')} />;
    if (activeTab === 'scraper') return <GoogleMapsScraper onImportComplete={(_l) => { showToast('Importado!', 'success'); refetch(); setActiveTab('buscar'); }} showToast={showToast} />;
    return null;
  }

  if (!isLogged) return <Login onLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <ToastContainer toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <div className="flex min-h-screen bg-[#050A1A] text-white">
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 p-4 flex-col transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center gap-3 mb-10"><LogoIcon /><div><h1 className="font-bold text-lg">MABRUMI</h1><p className="text-xs text-slate-400">CORRETORA</p></div></div>
          <nav className="space-y-2">
            <button onClick={() => { setActiveTab('buscar'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'buscar' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}><Search size={18} /> Buscar Leads</button>
            <button onClick={() => { setActiveTab('base'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'base' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}><Users size={18} /> Base de Leads</button>
            <button onClick={() => { setActiveTab('disparo'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'disparo' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}><Send size={18} /> Disparo WhatsApp</button>
            <div className="border-t border-slate-800 my-2" />
            <button onClick={() => { setActiveTab('scraper'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'scraper' ? 'bg-green-500/20 text-green-400' : 'text-slate-400'}`}><Map size={18} /> Google Maps</button>
            <button onClick={() => { setActiveTab('importar'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'importar' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}><Upload size={18} /> Importar CSV</button>
            <div className="border-t border-slate-800 my-2" />
            <button onClick={() => { setActiveTab('lixeira'); setSidebarOpen(false) }} className={`w-full text-left p-3 rounded ${activeTab === 'lixeira' ? 'bg-red-500/20 text-red-400' : 'text-slate-400'}`}><Trash2 size={18} /> Lixeira {trashedLeads.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-400 text-[10px] font-bold">{trashedLeads.length}</span>}</button>
          </nav>
          <button onClick={() => { supabase.auth.signOut(); setIsLogged(false); }} className="mt-auto flex items-center gap-3 p-3 text-slate-400 hover:text-red-400"><LogOut size={18} /> Sair</button>
        </aside>
        <main className="flex-1 p-4 lg:p-8">
          <div className="flex items-center gap-3 mb-6"><button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-slate-800 rounded"><Menu /></button><h1 className="text-2xl font-bold">Olá, Corretor 👋</h1></div >
          {getTabContent()}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App