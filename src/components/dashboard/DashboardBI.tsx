import { useState, useEffect, useMemo } from 'react'
import { Building2, TrendingUp, Users, Phone, MapPin, Activity, ArrowUpRight, ArrowDownRight, Zap, Globe, Database, BarChart3, Clock, Star, Briefcase, ShieldCheck, Target } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Lead } from '@/types/lead'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

interface Props {
  leads: Lead[]
  baseLeads: any[]
  showToast: (msg: string, type?: string) => void
  onNavigate?: (tab: string) => void
}

// ── KPI Card ──
function KpiCard({ icon: Icon, label, value, trend, trendUp, color, subtitle }: {
  icon: any; label: string; value: string | number; trend?: string; trendUp?: boolean
  color: string; subtitle?: string
}) {
  return (
    <div className="glass-sm p-4 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {trendUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
    </div>
  )
}

// ── Chart Card wrapper ──
function ChartCard({ title, icon: Icon, children, className = '' }: {
  title: string; icon: any; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`glass-sm p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} className="text-cyan-400" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Activity Item ──
function ActivityItem({ icon: Icon, iconColor, text, time }: {
  icon: any; iconColor: string; text: string; time: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${iconColor}15` }}>
        <Icon size={13} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-300 truncate">{text}</p>
        <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
          <Clock size={9} /> {time}
        </p>
      </div>
    </div>
  )
}

export default function DashboardBI({ leads, baseLeads, showToast, onNavigate }: Props) {
  const [animateIn, setAnimateIn] = useState(false)
  useEffect(() => { setAnimateIn(true) }, [])

  // ── Compute KPIs ──
  const stats = useMemo(() => {
    const total = baseLeads.length
    const enriched = baseLeads.filter(l => l.enriched_data?.CNPJ || l.cnpj).length
    const withPhone = baseLeads.filter(l => l.phone && l.phone.length > 5).length
    const contacted = baseLeads.filter(l => l.status === 'contacted').length
    const qualified = baseLeads.filter(l => l.status === 'qualified').length
    const conversionRate = total > 0 ? Math.round((qualified / total) * 100) : 0
    const enrichRate = total > 0 ? Math.round((enriched / total) * 100) : 0

    // By source
    const bySource: Record<string, number> = {}
    baseLeads.forEach(l => { bySource[l.source || 'other'] = (bySource[l.source || 'other'] || 0) + 1 })

    // By city (top 6)
    const byCity: Record<string, number> = {}
    baseLeads.forEach(l => { if (l.city) byCity[l.city] = (byCity[l.city] || 0) + 1 })
    const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // By plan
    const byPlan: Record<string, number> = {}
    baseLeads.forEach(l => { byPlan[l.plan || 'Individual'] = (byPlan[l.plan || 'Individual'] || 0) + 1 })

    // By porte (from enriched_data)
    const byPorte: Record<string, number> = {}
    baseLeads.forEach(l => {
      const porte = l.enriched_data?.Porte || 'Não informado'
      byPorte[porte] = (byPorte[porte] || 0) + 1
    })

    // Timeline (last 7 days by created_at)
    const now = new Date()
    const timeline: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const dayStr = d.toISOString().split('T')[0]
      const count = baseLeads.filter(l => l.created_at?.startsWith(dayStr)).length
      timeline.push({ label, count })
    }

    // Pipeline
    const pipeline = {
      novo: baseLeads.filter(l => l.status === 'new').length,
      contactado: contacted,
      qualificado: qualified,
    }

    return { total, enriched, withPhone, contacted, qualified, conversionRate, enrichRate, bySource, topCities, byPlan, byPorte, timeline, pipeline }
  }, [baseLeads])

  // ── Chart configs ──
  const cityChartData = {
    labels: stats.topCities.map(([c]) => c.length > 12 ? c.slice(0, 12) + '...' : c),
    datasets: [{
      data: stats.topCities.map(([, v]) => v),
      backgroundColor: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.6,
    }]
  }

  const planChartData = {
    labels: Object.keys(stats.byPlan),
    datasets: [{
      data: Object.values(stats.byPlan),
      backgroundColor: ['#06b6d4', '#f59e0b', '#10b981'],
      borderWidth: 0,
      spacing: 3,
    }]
  }

  const timelineChartData = {
    labels: stats.timeline.map(t => t.label),
    datasets: [{
      label: 'Leads',
      data: stats.timeline.map(t => t.count),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#06b6d4',
      pointBorderColor: '#06b6d4',
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  }

  const pipelineChartData = {
    labels: ['Novo', 'Contactado', 'Qualificado'],
    datasets: [{
      data: [stats.pipeline.novo, stats.pipeline.contactado, stats.pipeline.qualificado],
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.5,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#64748b', font: { size: 10 } } },
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#94a3b8', font: { size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
      }
    }
  }

  return (
    <div className={`space-y-5 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-400" />
            Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Visão geral do seu pipeline de vendas</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Activity size={12} className="text-emerald-400 animate-pulse" />
          <span>Dados em tempo real</span>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Database} label="Total Leads" value={stats.total} color="#06b6d4" trend={stats.total > 0 ? `${stats.total}` : undefined} trendUp={stats.total > 0} />
        <KpiCard icon={ShieldCheck} label="CNPJ Enriched" value={stats.enriched} color="#10b981" subtitle={`${stats.enrichRate}% da base`} />
        <KpiCard icon={Phone} label="Com Telefone" value={stats.withPhone} color="#f59e0b" subtitle={stats.total > 0 ? `${Math.round(stats.withPhone / stats.total * 100)}% disponíveis` : ''} />
        <KpiCard icon={Users} label="Contactados" value={stats.contacted} color="#3b82f6" />
        <KpiCard icon={Target} label="Qualificados" value={stats.qualified} color="#8b5cf6" />
        <KpiCard icon={TrendingUp} label="Conversão" value={`${stats.conversionRate}%`} color="#ec4899" trend={stats.conversionRate > 10 ? 'Bom' : 'Baixo'} trendUp={stats.conversionRate > 10} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <ChartCard title="Pipeline de Vendas" icon={Target}>
          <div className="h-48">
            <Bar data={pipelineChartData} options={chartOptions} />
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span className="text-slate-400">Novo ({stats.pipeline.novo})</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-slate-400">Contactado ({stats.pipeline.contactado})</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-slate-400">Qualificado ({stats.pipeline.qualificado})</span>
            </div>
          </div>
        </ChartCard>

        {/* Timeline */}
        <ChartCard title="Atividade — Últimos 7 Dias" icon={Activity}>
          <div className="h-48">
            <Line data={timelineChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Cidades */}
        <ChartCard title="Top Cidades" icon={MapPin}>
          <div className="h-48">
            {stats.topCities.length > 0 ? (
              <Bar data={cityChartData} options={{ ...chartOptions, indexAxis: 'y' as const }} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </ChartCard>

        {/* Plan Distribution */}
        <ChartCard title="Distribuição por Plano" icon={Briefcase}>
          <div className="h-48">
            {Object.keys(stats.byPlan).length > 0 ? (
              <Doughnut data={planChartData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </ChartCard>

        {/* Porte Distribution */}
        <ChartCard title="Porte das Empresas" icon={Building2}>
          <div className="h-48">
            {Object.keys(stats.byPorte).length > 0 ? (
              <Doughnut
                data={{
                  labels: Object.keys(stats.byPorte),
                  datasets: [{
                    data: Object.values(stats.byPorte),
                    backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'],
                    borderWidth: 0,
                    spacing: 2,
                  }]
                }}
                options={doughnutOptions}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row — Source + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads by Source */}
        <ChartCard title="Leads por Origem" icon={Globe}>
          <div className="space-y-2.5">
            {Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              const colors: Record<string, string> = {
                'Google Maps': '#10b981', 'CSV': '#3b82f6', 'IA Vision': '#8b5cf6',
                'website': '#06b6d4', 'referral': '#f59e0b', 'purchase': '#ec4899',
              }
              return (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-24 text-[11px] text-slate-400 truncate">{source}</div>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[source] || '#64748b' }} />
                  </div>
                  <div className="w-16 text-right text-[11px] text-slate-500">{count} ({pct}%)</div>
                </div>
              )
            })}
            {Object.keys(stats.bySource).length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">Nenhum lead na base</p>
            )}
          </div>
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard title="Atividade Recente" icon={Clock}>
          <div className="max-h-52 overflow-y-auto">
            {baseLeads.length > 0 ? (
              <>
                {baseLeads.slice(0, 5).map((lead, i) => {
                  const hasCNPJ = !!(lead.enriched_data?.CNPJ || lead.cnpj)
                  const actions = [
                    { icon: hasCNPJ ? ShieldCheck : Building2, color: hasCNPJ ? '#10b981' : '#64748b', text: `${lead.name} ${hasCNPJ ? '— CNPJ enriched' : '— sem CNPJ'}` },
                  ]
                  const timeAgo = lead.created_at ? getTimeAgo(lead.created_at) : 'recente'
                  return <ActivityItem key={lead.id || i} icon={actions[0].icon} iconColor={actions[0].color} text={actions[0].text} time={timeAgo} />
                })}
              </>
            ) : (
              <div className="text-center py-6">
                <Clock size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">Nenhuma atividade recente</p>
                <p className="text-slate-700 text-xs mt-1">Comece buscando leads na Busca Inteligente</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <div className="glass-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ações Rápidas</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Buscar por CEP', desc: 'Encontre empresas por endereço', color: '#06b6d4', tab: 'address' },
            { label: 'Google Maps', desc: 'Scrape leads do Maps', color: '#10b981', tab: 'scraper' },
            { label: 'Importar CSV', desc: 'Importe sua lista', color: '#3b82f6', tab: 'importar' },
            { label: 'Enviar WhatsApp', desc: 'Disparo em massa', color: '#f59e0b', tab: 'disparo' },
          ].map(action => (
            <div key={action.label} onClick={() => onNavigate?.(action.tab)} className="p-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 bg-slate-900/30 cursor-pointer transition-all group">
              <p className="text-sm text-white font-medium mb-0.5 group-hover:text-cyan-400 transition-colors">{action.label}</p>
              <p className="text-[10px] text-slate-500">{action.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d atrás`
}
