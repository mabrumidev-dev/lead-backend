import { useEffect, useCallback } from 'react'
import { X, Download, FileText, FileSpreadsheet, Printer, Trash2, ArrowRight } from 'lucide-react'
import { Lead, PIPELINE_STAGES, getStageInfo } from '@/types/lead'
import { ScrapedLead } from '@/hooks/useScraper'
import { LinkedInIcon, InstagramIcon, FacebookIcon, XIcon } from '@/components/SocialIcons'

// ── Unified lead type ──
type AnyLead = ScrapedLead | Lead

interface Props {
  lead: AnyLead | null
  onClose: () => void
  onQuickMove?: (lead: Lead, stage: Lead['status']) => void
  onTrash?: () => void
}

// ── Helpers ──
const fmt = (v: any) => v ?? 'Não informado'
const fmtCNPJ = (v: string | undefined | null) => {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return v
}
const fmtCurrency = (v: any) => {
  if (v === null || v === undefined || v === '') return ''
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}
const fmtPhone = (ddd: string, num: string) => {
  if (!num) return null
  const d = (ddd || '').replace(/\D/g, '')
  const n = num.replace(/\D/g, '')
  if (n.length === 11) return `(${d}) ${n.slice(0,5)}-${n.slice(5)}`
  if (n.length === 10) return `(${d}) ${n.slice(0,4)}-${n.slice(4)}`
  return num
}

function isScrapedLead(lead: AnyLead): lead is ScrapedLead {
  return 'Name' in lead && typeof (lead as any).Name === 'string'
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400 bg-emerald-500/15'
  if (score >= 50) return 'text-amber-400 bg-amber-500/15'
  return 'text-slate-400 bg-slate-500/15'
}

const SOCIAL_ICONS: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'LinkedIn': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', icon: <LinkedInIcon size={22} className="text-blue-400" /> },
  'Instagram': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25', icon: <InstagramIcon size={22} className="text-pink-400" /> },
  'Facebook': { color: 'text-blue-500', bg: 'bg-blue-600/10', border: 'border-blue-600/25', icon: <FacebookIcon size={22} className="text-blue-500" /> },
  'Twitter/X': { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', icon: <XIcon size={22} className="text-sky-400" /> },
}

// ── Field component ──
function Field({ emoji, label, value }: { emoji: string; label: string; value: any }) {
  const text = value ?? 'Não informado'
  if (!text || text === 'Não informado' || text === '' || text === null || text === undefined) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-sm mt-0.5 shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        {typeof text === 'string' && text.startsWith('http') ? (
          <a href={text} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all">{text}</a>
        ) : (
          <p className="text-sm text-slate-200 break-words">{text}</p>
        )}
      </div>
    </div>
  )
}

// ── Main component ──
export default function LeadDetailModal({ lead, onClose, onQuickMove, onTrash }: Props) {
  if (!lead) return null
  const scraped = isScrapedLead(lead)
  const crmLead = !scraped ? (lead as Lead) : null

  // Normalized accessors (work for both ScrapedLead and Lead)
  const name = scraped ? (lead as ScrapedLead).Name : (crmLead!.name || 'Lead sem nome')
  const phone = scraped ? (lead as ScrapedLead).Phone : (crmLead!.phone || '')
  const email = scraped ? (lead as ScrapedLead).Email : (crmLead!.email || '')
  const city = scraped ? (lead as ScrapedLead).Municipio : (crmLead!.city || '')
  const website = scraped ? (lead as ScrapedLead).Website : (crmLead!.website || '')
  const enriched = scraped ? (lead as ScrapedLead) : (crmLead!.enriched_data || lead)

  // CNPJ data
  const CNPJ = (enriched as any).CNPJ || ''
  const hasCNPJ = !!(CNPJ && (enriched as any).RazaoSocial)
  const enrichedAny = enriched as any

  // Kanban mode
  const kanbanMode = !!onQuickMove && !!crmLead
  const stage = kanbanMode ? getStageInfo(crmLead.status) : null

  // Keyboard close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // ── Export ──
  const downloadCSV = useCallback(() => {
    const h = [
      'Nome','Telefone','Email','Cidade','Website','CNPJ','Razão Social','Nome Fantasia',
      'Responsável','Porte','Atividade Principal','Situação','Capital Social','Natureza Jurídica',
      'CEP','UF','Município','Bairro','Endereço','Telefone 1','Telefone 2','CNAE Fiscal',
      'Simples','MEI','QSA','Redes Sociais'
    ]
    const qsa = (enrichedAny.QSA || []).map((s: any) => `${s.nome} (${s.qualificacao})`).join('; ')
    const social = enrichedAny.SocialMedia || {}
    const socialStr = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found).map(([k, v]: any) => `${k}: ${v.url}`).join('; ')
    const v = [
      name, phone || '', email || '', city || '', website || '',
      CNPJ || '', enrichedAny.RazaoSocial || '', enrichedAny.NomeFantasia || '',
      enrichedAny.Responsavel || '', enrichedAny.Porte || '', enrichedAny.AtividadePrincipal || '',
      enrichedAny.SituacaoCadastral || '', enrichedAny.CapitalSocial || '', enrichedAny.NaturezaJuridica || '',
      enrichedAny.CEP || '', enrichedAny.UF || '', enrichedAny.Municipio || '', enrichedAny.Bairro || '',
      enrichedAny.EnderecoCompleto || '', enrichedAny.Telefone1 || '', enrichedAny.Telefone2 || '',
      enrichedAny.CNAEFiscal || '', String(enrichedAny.OpcaoSimples ?? ''), String(enrichedAny.OpcaoMEI ?? ''),
      qsa, socialStr
    ]
    const csv = [h.join(','), v.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `lead-${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }, [lead, enriched])

  const downloadTXT = useCallback(() => {
    const sep = '═'.repeat(56)
    const line = '─'.repeat(56)
    let txt = `\n${sep}\n  DADOS DO LEAD\n${sep}\n\n`
    txt += `📋 DADOS GERAIS\n${line}\n`
    txt += `  Nome:        ${name}\n`
    txt += `  Telefone:    ${phone || 'N/A'}\n`
    txt += `  Email:       ${email || 'N/A'}\n`
    txt += `  Cidade:      ${city || 'N/A'}\n`
    txt += `  Site:        ${website || 'N/A'}\n`
    if (crmLead) {
      txt += `  Score:       ${crmLead.score || 0}%\n`
      txt += `  Status:      ${crmLead.status}\n`
      txt += `  Plano:       ${crmLead.plan || 'N/A'}\n`
    }
    if (scraped) {
      const sl = lead as ScrapedLead
      txt += `  Avaliação:   ${sl.Rating ?? 'N/A'} (${sl['Total Reviews'] ?? 0} reviews)\n`
      txt += `  Endereço:    ${sl.Address ?? 'N/A'}\n`
    }
    if (hasCNPJ) {
      txt += `\n📋 DADOS EMPRESARIAIS\n${line}\n`
      txt += `  CNPJ:              ${fmtCNPJ(CNPJ)}\n`
      txt += `  Razão Social:      ${enrichedAny.RazaoSocial}\n`
      txt += `  Nome Fantasia:     ${fmt(enrichedAny.NomeFantasia)}\n`
      txt += `  Responsável:       ${fmt(enrichedAny.Responsavel)}\n`
      txt += `  Situação:          ${fmt(enrichedAny.SituacaoCadastral)}\n`
      txt += `  Natureza Jurídica: ${fmt(enrichedAny.NaturezaJuridica)}\n`
      txt += `  Porte:             ${fmt(enrichedAny.Porte)}\n`
      txt += `  Capital Social:    ${fmtCurrency(enrichedAny.CapitalSocial) || 'N/A'}\n`
      txt += `  Atividade:         ${fmt(enrichedAny.AtividadePrincipal)}\n`
      txt += `  CNAE:              ${fmt(enrichedAny.CNAEFiscal)}\n`
      txt += `  Início Atividade:  ${fmt(enrichedAny.DataInicioAtividade)}\n`
      txt += `  Simples:           ${enrichedAny.OpcaoSimples === true ? 'Sim' : enrichedAny.OpcaoSimples === false ? 'Não' : 'N/A'}\n`
      txt += `  MEI:               ${enrichedAny.OpcaoMEI === true ? 'Sim' : enrichedAny.OpcaoMEI === false ? 'Não' : 'N/A'}\n`
      txt += `  Tipo:              ${fmt(enrichedAny.IdentificadorMatrizFilial)}\n`
      txt += `\n📍 ENDEREÇO\n${line}\n`
      txt += `  Completo:  ${fmt(enrichedAny.EnderecoCompleto)}\n`
      txt += `  CEP:       ${fmt(enrichedAny.CEP)}\n`
      txt += `  UF:        ${fmt(enrichedAny.UF)}\n`
      txt += `  Município: ${fmt(enrichedAny.Municipio)}\n`
      txt += `  Bairro:    ${fmt(enrichedAny.Bairro)}\n`
      txt += `\n📞 CONTATO\n${line}\n`
      txt += `  Tel 1:     ${fmt(enrichedAny.Telefone1)}\n`
      txt += `  Tel 2:     ${fmt(enrichedAny.Telefone2)}\n`
      txt += `  Email:     ${fmt(enrichedAny.Email)}\n`
      if (enrichedAny.QSA && enrichedAny.QSA.length > 0) {
        txt += `\n👥 QUADRO SOCIETÁRIO (${enrichedAny.QSA.length})\n${line}\n`
        for (const q of enrichedAny.QSA) {
          txt += `  • ${q.nome}\n    CPF: ${q.cnpj_cpf || '-'} | ${q.qualificacao} | Desde ${q.entrada} | ${q.faixa_etaria}\n`
          if (q.representante_legal) txt += `    Rep. Legal: ${q.representante_legal} (${q.rep_qualificacao})\n`
        }
      }
      if (enrichedAny.RegimeTributario && enrichedAny.RegimeTributario.length > 0) {
        txt += `\n💰 REGIME TRIBUTÁRIO\n${line}\n`
        for (const r of enrichedAny.RegimeTributario) txt += `  • ${r}\n`
      }
      if (enrichedAny.CnaesSecundarios && enrichedAny.CnaesSecundarios.length > 0) {
        txt += `\n🏭 CNAEs SECUNDÁRIOS\n${line}\n`
        for (const c of enrichedAny.CnaesSecundarios) txt += `  • ${c}\n`
      }
    }
    // Social media
    const social = enrichedAny.SocialMedia || {}
    const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)
    if (socialEntries.length > 0) {
      txt += `\n🔗 REDES SOCIAIS\n${line}\n`
      for (const [p, d] of socialEntries) txt += `  • ${p}: ${(d as any).url}\n`
    }
    // Health plan
    if (enrichedAny.HealthPlan) {
      txt += `\n🏥 PLANO DE SAÚDE\n${line}\n`
      txt += `  Identificado: ${enrichedAny.HealthPlan.tem_plano === true ? 'Sim' : enrichedAny.HealthPlan.tem_plano === false ? 'Não' : 'Inconclusivo'}\n`
      txt += `  Tipo: ${enrichedAny.HealthPlan.tipo || 'N/A'}\n`
      txt += `  Confiança: ${enrichedAny.HealthPlan.confianca || 'N/A'}\n`
    }
    // Employee count
    if (enrichedAny.EmployeeCount && enrichedAny.EmployeeCount.fonte) {
      txt += `\n👥 COLABORADORES\n${line}\n`
      txt += `  Quantidade: ${(enrichedAny.EmployeeCount.funcionarios ?? enrichedAny.EmployeeCount.faixa) || 'N/A'}\n`
      txt += `  Fonte: ${enrichedAny.EmployeeCount.fonte}\n`
      txt += `  Confiança: ${enrichedAny.EmployeeCount.confianca || 'N/A'}\n`
    }
    txt += `\n${sep}\n  Mabrumi CRM Pro\n${sep}\n`
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `lead-${name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click(); URL.revokeObjectURL(url)
  }, [lead, enriched])

  const downloadPDF = useCallback(() => {
    const qsaRows = (enrichedAny.QSA || []).map((q: any) => `
      <tr>
        <td>${q.nome}</td>
        <td>${q.cnpj_cpf || '-'}</td>
        <td>${q.qualificacao}</td>
        <td>${q.entrada}</td>
        <td>${q.faixa_etaria}</td>
        <td>${q.representante_legal || '-'}</td>
      </tr>`).join('')
    const cnaeRows = (enrichedAny.CnaesSecundarios || []).map((c: string) => `<li>${c}</li>`).join('')
    const regimeRows = (enrichedAny.RegimeTributario || []).map((r: string) => `<li>${r}</li>`).join('')
    const social = enrichedAny.SocialMedia || {}
    const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)
    const socialRows = socialEntries.map(([p, d]: any) => `<tr><td>${p}</td><td><a href="${d.url}">${d.url}</a></td></tr>`).join('')

    const googleSection = scraped ? `
      <div class="field"><span class="label">📞 Telefone:</span><span class="value">${(lead as ScrapedLead).Phone ?? 'N/A'}</span></div>
      <div class="field"><span class="label">⭐ Avaliação:</span><span class="value">${(lead as ScrapedLead).Rating ?? 'N/A'} (${(lead as ScrapedLead)['Total Reviews'] ?? 0} reviews)</span></div>
      <div class="field" style="grid-column:1/3"><span class="label">📍 Endereço:</span><span class="value">${(lead as ScrapedLead).Address ?? 'N/A'}</span></div>
      <div class="field" style="grid-column:1/3"><span class="label">🌐 Site:</span><span class="value">${(lead as ScrapedLead).Website ?? 'N/A'}</span></div>
    ` : `
      <div class="field"><span class="label">📞 Telefone:</span><span class="value">${crmLead!.phone || 'N/A'}</span></div>
      <div class="field"><span class="label">✉️ Email:</span><span class="value">${crmLead!.email || 'N/A'}</span></div>
      <div class="field"><span class="label">📍 Cidade:</span><span class="value">${crmLead!.city || 'N/A'}</span></div>
      <div class="field"><span class="label">📋 Plano:</span><span class="value">${crmLead!.plan || 'N/A'}</span></div>
      <div class="field"><span class="label">📊 Score:</span><span class="value">${crmLead!.score || 0}%</span></div>
      <div class="field"><span class="label">📋 Status:</span><span class="value">${crmLead!.status}</span></div>
    `

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: auto; margin: 10mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
  h1 { color: #0891b2; font-size: 22px; border-bottom: 3px solid #0891b2; padding-bottom: 8px; margin-bottom: 20px; }
  h2 { color: #0e7490; font-size: 15px; margin: 20px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; page-break-after: avoid; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .field { margin: 4px 0; }
  .label { font-weight: 700; color: #475569; font-size: 12px; display: inline; }
  .value { font-size: 13px; color: #0f172a; display: inline; margin-left: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 8px 0; }
  th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 11px; border: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 11px; }
  ul { margin: 4px 0 4px 18px; font-size: 12px; }
  li { margin: 2px 0; }
  .section { page-break-inside: avoid; }
  .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { padding: 15px; } }
</style></head><body>
<h1>${name}</h1>

<div class="section">
<h2>📋 Dados Gerais</h2>
<div class="grid">${googleSection}</div>
</div>

<div class="section">
<h2>🏢 Dados Empresariais (Receita Federal)</h2>
<div class="grid">
  <div class="field"><span class="label">📋 CNPJ:</span><span class="value">${fmtCNPJ(CNPJ) || 'N/A'}</span></div>
  <div class="field"><span class="label">📋 Situação:</span><span class="value">${fmt(enrichedAny.SituacaoCadastral)}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">📑 Razão Social:</span><span class="value">${enrichedAny.RazaoSocial || 'N/A'}</span></div>
  <div class="field"><span class="label">🏷️ Nome Fantasia:</span><span class="value">${fmt(enrichedAny.NomeFantasia)}</span></div>
  <div class="field"><span class="label">👤 Responsável:</span><span class="value">${fmt(enrichedAny.Responsavel)}</span></div>
  <div class="field"><span class="label">📊 Porte:</span><span class="value">${fmt(enrichedAny.Porte)}</span></div>
  <div class="field"><span class="label">🏛️ Natureza Jurídica:</span><span class="value">${fmt(enrichedAny.NaturezaJuridica)}</span></div>
  <div class="field"><span class="label">💰 Capital Social:</span><span class="value">${fmtCurrency(enrichedAny.CapitalSocial)}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">⚙️ Atividade Principal:</span><span class="value">${fmt(enrichedAny.AtividadePrincipal)}</span></div>
  <div class="field"><span class="label">🔢 CNAE:</span><span class="value">${fmt(enrichedAny.CNAEFiscal)}</span></div>
  <div class="field"><span class="label">🏷️ Tipo:</span><span class="value">${fmt(enrichedAny.IdentificadorMatrizFilial)}</span></div>
  <div class="field"><span class="label">📅 Início Atividade:</span><span class="value">${fmt(enrichedAny.DataInicioAtividade)}</span></div>
  <div class="field"><span class="label">✅ Simples Nacional:</span><span class="value">${enrichedAny.OpcaoSimples === true ? 'Sim' : enrichedAny.OpcaoSimples === false ? 'Não' : 'N/A'}</span></div>
  <div class="field"><span class="label">🏠 MEI:</span><span class="value">${enrichedAny.OpcaoMEI === true ? 'Sim' : enrichedAny.OpcaoMEI === false ? 'Não' : 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">✉️ Email:</span><span class="value">${fmt(enrichedAny.Email)}</span></div>
</div>
</div>

<div class="section">
<h2>📍 Endereço</h2>
<div class="grid">
  <div class="field" style="grid-column:1/3"><span class="label">🏠 Logradouro:</span><span class="value">${fmt(enrichedAny.EnderecoCompleto)}</span></div>
  <div class="field"><span class="label">📮 CEP:</span><span class="value">${fmt(enrichedAny.CEP)}</span></div>
  <div class="field"><span class="label">🗺️ UF:</span><span class="value">${fmt(enrichedAny.UF)}</span></div>
  <div class="field"><span class="label">🏙️ Município:</span><span class="value">${fmt(enrichedAny.Municipio)}</span></div>
  <div class="field"><span class="label">📍 Bairro:</span><span class="value">${fmt(enrichedAny.Bairro)}</span></div>
</div>
</div>

<div class="section">
<h2>📞 Contato</h2>
<div class="grid">
  <div class="field"><span class="label">📱 Telefone 1:</span><span class="value">${fmt(enrichedAny.Telefone1)}</span></div>
  <div class="field"><span class="label">📱 Telefone 2:</span><span class="value">${fmt(enrichedAny.Telefone2)}</span></div>
</div>
</div>

${(enrichedAny.QSA || []).length > 0 ? `<div class="section"><h2>👥 Quadro Societário (${enrichedAny.QSA.length})</h2><table><tr><th>Nome</th><th>CPF</th><th>Qualificação</th><th>Entrada</th><th>Faixa Etária</th><th>Rep. Legal</th></tr>${qsaRows}</table></div>` : ''}
${cnaeRows ? `<div class="section"><h2>🏭 CNAEs Secundários</h2><ul>${cnaeRows}</ul></div>` : ''}
${regimeRows ? `<div class="section"><h2>💰 Regime Tributário</h2><ul>${regimeRows}</ul></div>` : ''}
${enrichedAny.HealthPlan ? `<div class="section"><h2>🏥 Plano de Saúde</h2><p><strong>${enrichedAny.HealthPlan.tem_plano === true ? 'Identificado' : enrichedAny.HealthPlan.tem_plano === null ? 'Inconclusivo' : 'Não Identificado'}</strong> — Tipo: ${enrichedAny.HealthPlan.tipo || '-'} | Confiança: ${enrichedAny.HealthPlan.confianca || '-'}</p></div>` : ''}
${enrichedAny.EmployeeCount && enrichedAny.EmployeeCount.fonte ? `<div class="section"><h2>👥 Colaboradores</h2><p><strong>${enrichedAny.EmployeeCount.funcionarios !== null ? enrichedAny.EmployeeCount.funcionarios + ' colaboradores' : 'Faixa: ' + (enrichedAny.EmployeeCount.faixa || '-')}</strong> — Fonte: ${enrichedAny.EmployeeCount.fonte} | Confiança: ${enrichedAny.EmployeeCount.confianca || '-'}</p></div>` : ''}
${socialEntries.length > 0 ? `<div class="section"><h2>🔗 Redes Sociais</h2><table><tr><th>Plataforma</th><th>URL</th></tr>${socialRows}</table></div>` : ''}

<div class="footer">Mabrumi CRM Pro — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
  }, [lead, enriched])

  // ── Social media section ──
  const social = enrichedAny.SocialMedia || {}
  const socialEntries = Object.entries(social).filter(([, v]: any) => v?.url && !v?.not_found)
  const socialNotFound = Object.entries(social).filter(([, v]: any) => v?.not_found)

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 pb-4 sm:pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl mx-2 sm:mx-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X size={18} />
        </button>

        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {kanbanMode && enrichedAny.NomeFantasia && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400 shrink-0">
                {enrichedAny.NomeFantasia[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {kanbanMode && stage && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.bgColor} ${stage.color} border ${stage.borderColor}`}>
                    {stage.icon} {stage.label}
                  </span>
                )}
                {kanbanMode && crmLead && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(crmLead.score)}`}>
                    ⭐ {crmLead.score}
                  </span>
                )}
                {hasCNPJ && enrichedAny.SituacaoCadastral && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    enrichedAny.SituacaoCadastral === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>{fmt(enrichedAny.SituacaoCadastral)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline move buttons (Kanban mode) */}
          {kanbanMode && crmLead && (
            <div className="mb-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Mover para:</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.filter(s => s.key !== crmLead.status).map(s => (
                  <button key={s.key} onClick={() => { onQuickMove!(crmLead, s.key); onClose() }}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${s.borderColor} ${s.bgColor} ${s.color} hover:scale-105 transition-transform`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-700 my-4" />

          {/* General info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Field emoji="📞" label="Telefone" value={phone} />
            <Field emoji="✉️" label="Email" value={email} />
            <Field emoji="📍" label="Cidade" value={city} />
            {website && <Field emoji="🌐" label="Site" value={website} />}
            {!scraped && crmLead && (
              <>
                <Field emoji="📋" label="Plano" value={crmLead.plan} />
                <Field emoji="📊" label="Score" value={crmLead.score ? `${crmLead.score}%` : null} />
                <Field emoji="📋" label="Status" value={crmLead.status === 'new' ? 'Novo' : crmLead.status === 'contacted' ? 'Contactado' : crmLead.status === 'qualified' ? 'Qualificado' : crmLead.status} />
                <Field emoji="📋" label="Fonte" value={crmLead.source} />
              </>
            )}
            {scraped && (
              <>
                <Field emoji="⭐" label="Avaliação" value={(lead as ScrapedLead).Rating ? `${(lead as ScrapedLead).Rating} (${(lead as ScrapedLead)['Total Reviews'] ?? 0} reviews)` : null} />
                <Field emoji="📍" label="Endereço Google" value={(lead as ScrapedLead).Address} />
              </>
            )}
          </div>

          {/* CNPJ / Business data */}
          {hasCNPJ && (
            <>
              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏢</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dados Empresariais</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📋" label="CNPJ" value={fmtCNPJ(CNPJ)} />
                <Field emoji="📑" label="Razão Social" value={enrichedAny.RazaoSocial} />
                <Field emoji="🏷️" label="Nome Fantasia" value={enrichedAny.NomeFantasia} />
                <Field emoji="🏛️" label="Natureza Jurídica" value={enrichedAny.NaturezaJuridica} />
                <Field emoji="📊" label="Porte" value={enrichedAny.Porte} />
                <Field emoji="💰" label="Capital Social" value={fmtCurrency(enrichedAny.CapitalSocial)} />
                <Field emoji="⚙️" label="Atividade Principal" value={enrichedAny.AtividadePrincipal} />
                <Field emoji="🔢" label="CNAE Fiscal" value={String(enrichedAny.CNAEFiscal ?? '')} />
                <Field emoji="📅" label="Início Atividade" value={enrichedAny.DataInicioAtividade} />
                <Field emoji="🏷️" label="Tipo" value={enrichedAny.IdentificadorMatrizFilial} />
                <Field emoji="✅" label="Simples Nacional" value={enrichedAny.OpcaoSimples === true ? 'Sim' : enrichedAny.OpcaoSimples === false ? 'Não' : null} />
                <Field emoji="🏠" label="MEI" value={enrichedAny.OpcaoMEI === true ? 'Sim' : enrichedAny.OpcaoMEI === false ? 'Não' : null} />
              </div>

              {/* Address */}
              <div className="border-t border-slate-700 my-4" />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📍</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Endereço</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="🏠" label="Logradouro" value={enrichedAny.EnderecoCompleto} />
                <Field emoji="📮" label="CEP" value={enrichedAny.CEP} />
                <Field emoji="🗺️" label="UF" value={enrichedAny.UF} />
                <Field emoji="🏙️" label="Município" value={enrichedAny.Municipio} />
                <Field emoji="📍" label="Bairro" value={enrichedAny.Bairro} />
              </div>

              {/* Contact */}
              <div className="border-t border-slate-700 my-4" />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📞</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contato</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📱" label="Telefone 1" value={enrichedAny.Telefone1} />
                <Field emoji="📱" label="Telefone 2" value={enrichedAny.Telefone2} />
                <Field emoji="✉️" label="Email" value={enrichedAny.Email} />
              </div>

              {/* QSA */}
              {enrichedAny.QSA && enrichedAny.QSA.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">👥</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Quadro Societário ({enrichedAny.QSA.length})</h3>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Nome</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">CPF</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Qualificação</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Faixa Etária</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Rep. Legal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrichedAny.QSA.map((q: any, i: number) => (
                            <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                              <td className="px-3 py-2 text-slate-200 font-medium">{q.nome}</td>
                              <td className="px-3 py-2 text-slate-300 font-mono">{q.cnpj_cpf || '-'}</td>
                              <td className="px-3 py-2 text-slate-300">{q.qualificacao}</td>
                              <td className="px-3 py-2 text-slate-300">{q.entrada}</td>
                              <td className="px-3 py-2 text-slate-300">{q.faixa_etaria}</td>
                              <td className="px-3 py-2 text-slate-300">{q.representante_legal || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* CNAEs secundários */}
              {enrichedAny.CnaesSecundarios && enrichedAny.CnaesSecundarios.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🏭</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">CNAEs Secundários ({enrichedAny.CnaesSecundarios.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enrichedAny.CnaesSecundarios.map((c: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[11px] border border-slate-600/30">{c}</span>
                    ))}
                  </div>
                </>
              )}

              {/* Regime tributário */}
              {enrichedAny.RegimeTributario && enrichedAny.RegimeTributario.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">💰</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Regime Tributário</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enrichedAny.RegimeTributario.map((r: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">{r}</span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* No CNPJ message */}
          {!hasCNPJ && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-center">
              <p className="text-slate-500 text-xs">Dados da Receita Federal não encontrados. Clique em "Buscar Responsável" para enriquecer.</p>
            </div>
          )}

          {/* Health plan */}
          {enrichedAny.HealthPlan && enrichedAny.HealthPlan.tipo && (
            <>
              <div className="border-t border-slate-700 my-4" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🏥</span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Plano de Saúde</span>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                enrichedAny.HealthPlan.tem_plano === true ? 'bg-emerald-500/10 border-emerald-500/25' :
                enrichedAny.HealthPlan.tem_plano === null ? 'bg-amber-500/10 border-amber-500/25' :
                'bg-slate-500/10 border-slate-500/25'
              }`}>
                <span className="text-xl">{enrichedAny.HealthPlan.tem_plano === true ? '🏥' : enrichedAny.HealthPlan.tem_plano === null ? '❓' : '⬜'}</span>
                <div>
                  <p className={`text-sm font-bold ${
                    enrichedAny.HealthPlan.tem_plano === true ? 'text-emerald-400' :
                    enrichedAny.HealthPlan.tem_plano === null ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {enrichedAny.HealthPlan.tem_plano === true ? 'Plano de Saúde Identificado' : enrichedAny.HealthPlan.tem_plano === null ? 'Verificação Inconclusiva' : 'Plano Não Identificado'}
                  </p>
                  <p className="text-[11px] text-slate-400">Tipo: {enrichedAny.HealthPlan.tipo || '-'} | Confiança: {enrichedAny.HealthPlan.confianca || '-'}</p>
                </div>
              </div>
            </>
          )}

          {/* Employee count */}
          {enrichedAny.EmployeeCount && enrichedAny.EmployeeCount.fonte && (
            <>
              <div className="border-t border-slate-700 my-4" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">👥</span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Colaboradores</span>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                enrichedAny.EmployeeCount.funcionarios !== null ? 'bg-emerald-500/10 border-emerald-500/25' :
                enrichedAny.EmployeeCount.fonte === 'linkedin' ? 'bg-blue-500/10 border-blue-500/25' :
                'bg-amber-500/10 border-amber-500/25'
              }`}>
                <span className="text-xl">👥</span>
                <div>
                  <p className={`text-sm font-bold ${
                    enrichedAny.EmployeeCount.funcionarios !== null ? 'text-emerald-400' :
                    enrichedAny.EmployeeCount.fonte === 'linkedin' ? 'text-blue-400' : 'text-amber-400'
                  }`}>
                    {enrichedAny.EmployeeCount.funcionarios !== null
                      ? `${enrichedAny.EmployeeCount.funcionarios.toLocaleString('pt-BR')} colaboradores`
                      : `Faixa estimada: ${enrichedAny.EmployeeCount.faixa} colaboradores`}
                  </p>
                  <p className="text-[11px] text-slate-400">Fonte: {enrichedAny.EmployeeCount.fonte} | Confiança: {enrichedAny.EmployeeCount.confianca}</p>
                </div>
              </div>
            </>
          )}

          {/* Social media */}
          <div className="border-t border-slate-700 my-4" />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔗</span>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
            {socialEntries.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">
                {socialEntries.length} perfil(is)
              </span>
            )}
          </div>
          {socialEntries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {socialEntries.map(([platform, data]: any) => {
                const style = SOCIAL_ICONS[platform] || { color: 'text-slate-400', bg: 'bg-slate-700/10', border: 'border-slate-600/25', icon: '🔗' }
                return (
                  <a key={platform} href={data.url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} hover:brightness-125 transition-all group`}>
                    <span className="text-2xl flex shrink-0">{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${style.color} uppercase tracking-wider`}>{platform}</p>
                      <p className="text-[11px] text-slate-400 truncate group-hover:text-slate-300">{data.title || data.url}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">↗</span>
                  </a>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Nenhuma busca realizada</p>
          )}
          {socialNotFound.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {socialNotFound.map(([platform]) => {
                const style = SOCIAL_ICONS[platform] || { color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/30', icon: '🔗' }
                return (
                  <span key={platform} className={`px-2 py-1 rounded-lg ${style.bg} border ${style.border} text-[10px] text-slate-500`}>
                    {style.icon} {platform} — não encontrado
                  </span>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-700 mt-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Download size={14} className="text-slate-500" />
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Exportar</span>
              </div>
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

            {/* Kanban trash button */}
            {kanbanMode && onTrash && (
              <div className="mt-3 flex">
                <button onClick={onTrash} className="flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-300 transition-colors">
                  <Trash2 size={14} /> Lixeira
                </button>
                <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-300 ml-auto transition-colors">Fechar</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
