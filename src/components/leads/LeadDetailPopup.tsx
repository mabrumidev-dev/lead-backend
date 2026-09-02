import { useEffect } from 'react'
import { X, Download, FileText, FileSpreadsheet, Printer } from 'lucide-react'
import { ScrapedLead, SocialMediaData } from '@/hooks/useScraper'
import { LinkedInIcon, InstagramIcon, FacebookIcon, XIcon } from '@/components/SocialIcons'

interface Props {
  lead: ScrapedLead | null
  onClose: () => void
}

export default function LeadDetailPopup({ lead, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!lead) return null

  const fmt = (v: any) => v ?? 'Não informado'
  const fmtCurrency = (v: any) => {
    if (v === null || v === undefined || v === '') return 'Não informado'
    return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }
  const fmtCNPJ = (v: string) => {
    if (!v) return 'Não informado'
    const d = v.replace(/\D/g, '')
    if (d.length === 14)
      return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    return v
  }
  const fmtPhone = (ddd: string, num: string) => {
    if (!num) return null
    const d = (ddd || '').replace(/\D/g, '')
    const n = num.replace(/\D/g, '')
    if (n.length === 11) return `(${d}) ${n.slice(0,5)}-${n.slice(5)}`
    if (n.length === 10) return `(${d}) ${n.slice(0,4)}-${n.slice(4)}`
    return num
  }

  const hasCNPJ = !!(lead.CNPJ && lead.RazaoSocial)

  const downloadCSV = () => {
    const h = [
      'Nome Google','Telefone Google','Endereço Google','Site','Avaliação','Reviews',
      'Razão Social','Nome Fantasia','CNPJ','Situação','Natureza Jurídica','Porte',
      'Capital Social','Atividade Principal','CEP','UF','Município','Bairro','Endereço',
      'Telefone 1','Telefone 2','Email','Responsável','Sócios',
      'Data Início Atividade','Opção Simples','Opção MEI','Identificador','Regime Tributário',
      'CNAE Fiscal','CNAEs Secundários','QSA',
      'LinkedIn','Instagram','Facebook','Twitter/X',
    ]
    const social = lead.SocialMedia || {}
    const v = [
      lead.Name, lead.Phone ?? '', lead.Address ?? '', lead.Website ?? '',
      lead.Rating ?? '', lead['Total Reviews'] ?? '',
      lead.RazaoSocial ?? '', lead.NomeFantasia ?? '', lead.CNPJ ?? '',
      lead.SituacaoCadastral ?? '', lead.NaturezaJuridica ?? '', lead.Porte ?? '',
      lead.CapitalSocial ?? '', lead.AtividadePrincipal ?? '',
      lead.CEP ?? '', lead.UF ?? '', lead.Municipio ?? '', lead.Bairro ?? '',
      lead.EnderecoCompleto ?? '', lead.Telefone1 ?? '', lead.Telefone2 ?? '',
      lead.Email ?? '', lead.Responsavel ?? '', lead.Socios ?? '',
      lead.DataInicioAtividade ?? '', String(lead.OpcaoSimples ?? ''),
      String(lead.OpcaoMEI ?? ''), lead.IdentificadorMatrizFilial ?? '',
      (lead.RegimeTributario ?? []).join('; '),
      String(lead.CNAEFiscal ?? ''),
      (lead.CnaesSecundarios ?? []).join('; '),
      (lead.QSA ?? []).map(q => `${q.nome} (${q.qualificacao})`).join('; '),
      social['LinkedIn']?.url ?? '', social['Instagram']?.url ?? '',
      social['Facebook']?.url ?? '', social['Twitter/X']?.url ?? '',
    ]
    const csv = [h.join(','), v.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lead-${lead.Name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTXT = () => {
    const sep = '═'.repeat(56)
    const line = '─'.repeat(56)
    let txt = `\n${sep}\n  DADOS COMPLETOS DO LEAD\n${sep}\n\n`
    txt += `📋 GOOGLE MAPS\n${line}\n`
    txt += `  Nome:        ${lead.Name}\n`
    txt += `  Telefone:    ${lead.Phone ?? 'N/A'}\n`
    txt += `  Endereço:    ${lead.Address ?? 'N/A'}\n`
    txt += `  Site:        ${lead.Website ?? 'N/A'}\n`
    txt += `  Avaliação:   ${lead.Rating ?? 'N/A'} (${lead['Total Reviews'] ?? 0} reviews)\n`
    if (hasCNPJ) {
      txt += `\n📋 DADOS EMPRESARIAIS (Receita Federal)\n${line}\n`
      txt += `  CNPJ:              ${fmtCNPJ(lead.CNPJ!)}\n`
      txt += `  Razão Social:      ${lead.RazaoSocial}\n`
      txt += `  Nome Fantasia:     ${fmt(lead.NomeFantasia)}\n`
      txt += `  Situação:          ${fmt(lead.SituacaoCadastral)}\n`
      txt += `  Natureza Jurídica: ${fmt(lead.NaturezaJuridica)}\n`
      txt += `  Porte:             ${fmt(lead.Porte)}\n`
      txt += `  Capital Social:    ${fmtCurrency(lead.CapitalSocial)}\n`
      txt += `  Atividade:         ${fmt(lead.AtividadePrincipal)}\n`
      txt += `  CNAE:              ${fmt(lead.CNAEFiscal)}\n`
      txt += `  Início Atividade:  ${fmt(lead.DataInicioAtividade)}\n`
      txt += `  Simples:           ${lead.OpcaoSimples === true ? 'Sim' : lead.OpcaoSimples === false ? 'Não' : 'N/A'}\n`
      txt += `  MEI:               ${lead.OpcaoMEI === true ? 'Sim' : lead.OpcaoMEI === false ? 'Não' : 'N/A'}\n`
      txt += `  Tipo:              ${fmt(lead.IdentificadorMatrizFilial)}\n`
      txt += `\n📍 ENDEREÇO\n${line}\n`
      txt += `  Completo:  ${fmt(lead.EnderecoCompleto)}\n`
      txt += `  CEP:       ${fmt(lead.CEP)}\n`
      txt += `  UF:        ${fmt(lead.UF)}\n`
      txt += `  Município: ${fmt(lead.Municipio)}\n`
      txt += `  Bairro:    ${fmt(lead.Bairro)}\n`
      txt += `\n📞 CONTATO\n${line}\n`
      txt += `  Tel 1:     ${fmt(lead.Telefone1)}\n`
      txt += `  Tel 2:     ${fmt(lead.Telefone2)}\n`
      txt += `  Email:     ${fmt(lead.Email)}\n`
      if (lead.QSA && lead.QSA.length > 0) {
        txt += `\n👥 QUADRO SOCIETÁRIO (${lead.QSA.length})\n${line}\n`
        for (const q of lead.QSA) {
          txt += `  • ${q.nome}\n    ${q.qualificacao} | Desde ${q.entrada} | ${q.faixa_etaria}\n`
          if (q.representante_legal) txt += `    Rep. Legal: ${q.representante_legal} (${q.rep_qualificacao})\n`
        }
      }
      if (lead.RegimeTributario && lead.RegimeTributario.length > 0) {
        txt += `\n💰 REGIME TRIBUTÁRIO\n${line}\n`
        for (const r of lead.RegimeTributario) txt += `  • ${r}\n`
      }
      if (lead.CnaesSecundarios && lead.CnaesSecundarios.length > 0) {
        txt += `\n🏭 CNAEs SECUNDÁRIOS\n${line}\n`
        for (const c of lead.CnaesSecundarios) txt += `  • ${c}\n`
      }
    }
    if (lead.SocialMedia && Object.keys(lead.SocialMedia).length > 0) {
      const found = Object.entries(lead.SocialMedia).filter(([, v]) => v?.url && !v?.not_found)
      if (found.length > 0) {
        txt += `\n🔗 REDES SOCIAIS\n${line}\n`
        for (const [platform, data] of found) txt += `  • ${platform}: ${data.url}\n`
      }
    }
    txt += `\n${sep}\n  Mabrumi CRM Pro\n${sep}\n`
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lead-${lead.Name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPDF = () => {
    const qsaRows = (lead.QSA || []).map(q => `
      <tr>
        <td>${q.nome}</td>
        <td>${q.qualificacao}</td>
        <td>${q.entrada}</td>
        <td>${q.faixa_etaria}</td>
        <td>${q.representante_legal || '-'}</td>
      </tr>`).join('')
    const cnaeRows = (lead.CnaesSecundarios || []).map(c => `<li>${c}</li>`).join('')
    const regimeRows = (lead.RegimeTributario || []).map(r => `<li>${r}</li>`).join('')
    const socialEntries = lead.SocialMedia ? Object.entries(lead.SocialMedia).filter(([, v]: any) => v?.url && !v?.not_found) : []
    const socialRows = socialEntries.map(([p, d]: any) => `<tr><td>${p}</td><td><a href="${d.url}">${d.url}</a></td></tr>`).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${lead.Name}</title>
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
<h1>${lead.Name}</h1>

<div class="section">
<h2>📋 Google Maps</h2>
<div class="grid">
  <div class="field"><span class="label">📞 Telefone:</span><span class="value">${lead.Phone ?? 'N/A'}</span></div>
  <div class="field"><span class="label">⭐ Avaliação:</span><span class="value">${lead.Rating ?? 'N/A'} (${lead['Total Reviews'] ?? 0} reviews)</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">📍 Endereço:</span><span class="value">${lead.Address ?? 'N/A'}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">🌐 Site:</span><span class="value">${lead.Website ?? 'N/A'}</span></div>
</div>
</div>

<div class="section">
<h2>🏢 Dados Empresariais (Receita Federal)</h2>
<div class="grid">
  <div class="field"><span class="label">📋 CNPJ:</span><span class="value">${fmtCNPJ(lead.CNPJ) || 'N/A'}</span></div>
  <div class="field"><span class="label">📋 Situação:</span><span class="value">${fmt(lead.SituacaoCadastral)}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">📑 Razão Social:</span><span class="value">${lead.RazaoSocial || 'N/A'}</span></div>
  <div class="field"><span class="label">🏷️ Nome Fantasia:</span><span class="value">${fmt(lead.NomeFantasia)}</span></div>
  <div class="field"><span class="label">📊 Porte:</span><span class="value">${fmt(lead.Porte)}</span></div>
  <div class="field"><span class="label">🏛️ Natureza Jurídica:</span><span class="value">${fmt(lead.NaturezaJuridica)}</span></div>
  <div class="field"><span class="label">💰 Capital Social:</span><span class="value">${fmtCurrency(lead.CapitalSocial)}</span></div>
  <div class="field" style="grid-column:1/3"><span class="label">⚙️ Atividade Principal:</span><span class="value">${fmt(lead.AtividadePrincipal)}</span></div>
  <div class="field"><span class="label">🔢 CNAE:</span><span class="value">${fmt(lead.CNAEFiscal)}</span></div>
  <div class="field"><span class="label">🏷️ Tipo:</span><span class="value">${fmt(lead.IdentificadorMatrizFilial)}</span></div>
  <div class="field"><span class="label">📅 Início Atividade:</span><span class="value">${fmt(lead.DataInicioAtividade)}</span></div>
  <div class="field"><span class="label">✅ Simples Nacional:</span><span class="value">${lead.OpcaoSimples === true ? 'Sim' : lead.OpcaoSimples === false ? 'Não' : 'N/A'}</span></div>
  <div class="field"><span class="label">🏠 MEI:</span><span class="value">${lead.OpcaoMEI === true ? 'Sim' : lead.OpcaoMEI === false ? 'Não' : 'N/A'}</span></div>
  <div class="field"><span class="label">✉️ Email:</span><span class="value">${fmt(lead.Email)}</span></div>
</div>
</div>

<div class="section">
<h2>📍 Endereço</h2>
<div class="grid">
  <div class="field" style="grid-column:1/3"><span class="label">🏠 Logradouro:</span><span class="value">${fmt(lead.EnderecoCompleto)}</span></div>
  <div class="field"><span class="label">📮 CEP:</span><span class="value">${fmt(lead.CEP)}</span></div>
  <div class="field"><span class="label">🗺️ UF:</span><span class="value">${fmt(lead.UF)}</span></div>
  <div class="field"><span class="label">🏙️ Município:</span><span class="value">${fmt(lead.Municipio)}</span></div>
  <div class="field"><span class="label">📍 Bairro:</span><span class="value">${fmt(lead.Bairro)}</span></div>
</div>
</div>

<div class="section">
<h2>📞 Contato</h2>
<div class="grid">
  <div class="field"><span class="label">📱 Telefone 1:</span><span class="value">${fmt(lead.Telefone1)}</span></div>
  <div class="field"><span class="label">📱 Telefone 2:</span><span class="value">${fmt(lead.Telefone2)}</span></div>
</div>
</div>

${(lead.QSA || []).length > 0 ? `<div class="section"><h2>👥 Quadro Societário (${lead.QSA!.length})</h2><table><tr><th>Nome</th><th>Qualificação</th><th>Entrada</th><th>Faixa Etária</th><th>Rep. Legal</th></tr>${qsaRows}</table></div>` : ''}

${(lead.CnaesSecundarios || []).length > 0 ? `<div class="section"><h2>🏭 CNAEs Secundários</h2><ul>${cnaeRows}</ul></div>` : ''}

${(lead.RegimeTributario || []).length > 0 ? `<div class="section"><h2>💰 Regime Tributário</h2><ul>${regimeRows}</ul></div>` : ''}

${lead.HealthPlan ? `<div class="section"><h2>🏥 Plano de Saúde</h2><p><strong>${lead.HealthPlan.tem_plano === true ? 'Identificado' : lead.HealthPlan.tem_plano === null ? 'Inconclusivo' : 'Não Identificado'}</strong> — Tipo: ${lead.HealthPlan.tipo || '-'} | Confiança: ${lead.HealthPlan.confianca || '-'}</p></div>` : ''}

${lead.EmployeeCount && lead.EmployeeCount.fonte ? `<div class="section"><h2>👥 Colaboradores</h2><p><strong>${lead.EmployeeCount.funcionarios !== null ? lead.EmployeeCount.funcionarios + ' colaboradores' : 'Faixa: ' + (lead.EmployeeCount.faixa || '-')}</strong> — Fonte: ${lead.EmployeeCount.fonte} | Confiança: ${lead.EmployeeCount.confianca || '-'}</p></div>` : ''}

${socialEntries.length > 0 ? `<div class="section"><h2>🔗 Redes Sociais</h2><table><tr><th>Plataforma</th><th>URL</th></tr>${socialRows}</table></div>` : ''}

<div class="footer">Mabrumi CRM Pro — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
</body></html>`
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  const Field = ({ emoji, label, value }: { emoji: string; label: string; value: any }) => {
    const text = value ?? 'Não informado'
    if (!text || text === 'Não informado' || text === '' || text === null || text === undefined) return null
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <span className="text-sm mt-0.5 shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
          <p className="text-sm text-slate-200 break-words">{text}</p>
        </div>
      </div>
    )
  }

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
          <h2 className="text-lg font-bold text-cyan-400 mb-1 pr-8">{lead.Name}</h2>
          <p className="text-xs text-slate-500 mb-4">Dados do Google Maps</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Field emoji="📞" label="Telefone" value={lead.Phone} />
            <Field emoji="⭐" label="Avaliação" value={lead.Rating ? `${lead.Rating} (${lead['Total Reviews'] ?? 0} reviews)` : null} />
            <Field emoji="📍" label="Endereço Google" value={lead.Address} />
            <Field emoji="🌐" label="Site" value={lead.Website ? (
              <a href={lead.Website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all text-sm">{lead.Website}</a>
            ) : null} />
          </div>

          {hasCNPJ && (
            <>
              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏢</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dados Empresariais</h3>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  lead.SituacaoCadastral === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>{fmt(lead.SituacaoCadastral)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📋" label="CNPJ" value={fmtCNPJ(lead.CNPJ!)} />
                <Field emoji="📑" label="Razão Social" value={lead.RazaoSocial} />
                <Field emoji="🏷️" label="Nome Fantasia" value={lead.NomeFantasia} />
                <Field emoji="🏛️" label="Natureza Jurídica" value={lead.NaturezaJuridica} />
                <Field emoji="📊" label="Porte" value={lead.Porte} />
                <Field emoji="💰" label="Capital Social" value={fmtCurrency(lead.CapitalSocial)} />
                <Field emoji="⚙️" label="Atividade Principal" value={lead.AtividadePrincipal} />
                <Field emoji="🔢" label="CNAE Fiscal" value={String(lead.CNAEFiscal ?? '')} />
                <Field emoji="📅" label="Início Atividade" value={lead.DataInicioAtividade} />
                <Field emoji="🏷️" label="Tipo" value={lead.IdentificadorMatrizFilial} />
                <Field emoji="✅" label="Simples Nacional" value={lead.OpcaoSimples === true ? 'Sim' : lead.OpcaoSimples === false ? 'Não' : null} />
                <Field emoji="🏠" label="MEI" value={lead.OpcaoMEI === true ? 'Sim' : lead.OpcaoMEI === false ? 'Não' : null} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📍</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Endereço</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="🏠" label="Logradouro" value={lead.EnderecoCompleto} />
                <Field emoji="📮" label="CEP" value={lead.CEP} />
                <Field emoji="🗺️" label="UF" value={lead.UF} />
                <Field emoji="🏙️" label="Município" value={lead.Municipio} />
                <Field emoji="📍" label="Bairro" value={lead.Bairro} />
              </div>

              <div className="border-t border-slate-700 my-4" />

              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📞</span>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Contato</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field emoji="📱" label="Telefone 1" value={lead.Telefone1} />
                <Field emoji="📱" label="Telefone 2" value={lead.Telefone2} />
                <Field emoji="✉️" label="Email" value={lead.Email} />
              </div>

              {lead.QSA && lead.QSA.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">👥</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Quadro Societário ({lead.QSA.length})</h3>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Nome</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Qualificação</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Faixa Etária</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Rep. Legal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lead.QSA.map((q, i) => (
                            <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                              <td className="px-3 py-2 text-slate-200 font-medium">{q.nome}</td>
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

              {lead.CnaesSecundarios && lead.CnaesSecundarios.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🏭</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">CNAEs Secundários ({lead.CnaesSecundarios.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.CnaesSecundarios.map((c, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[11px] border border-slate-600/30">{c}</span>
                    ))}
                  </div>
                </>
              )}

              {lead.RegimeTributario && lead.RegimeTributario.length > 0 && (
                <>
                  <div className="border-t border-slate-700 my-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">💰</span>
                    <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Regime Tributário</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.RegimeTributario.map((r, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">{r}</span>
                    ))}
                  </div>
                </>
              )}

              {lead.Responsavel && (
                <>
                  <div className="border-t border-slate-700 my-4" />

                  <SocialMediaSection lead={lead} />

                  {lead.HealthPlan && <HealthPlanSection healthPlan={lead.HealthPlan} />}

                  {lead.EmployeeCount && <EmployeeCountSection employeeCount={lead.EmployeeCount} />}
                </>
              )}
            </>
          )}

          {!hasCNPJ && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 text-center">
              <p className="text-slate-500 text-xs">Dados da Receita Federal não encontrados. Clique em "Buscar Responsável" para enriquecer.</p>
            </div>
          )}

          <div className="border-t border-slate-700 mt-4 pt-4">
            <div className="flex items-center gap-2 mb-3">
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
        </div>
      </div>
    </div>
  )
}

const SOCIAL_ICONS: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'LinkedIn': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', icon: <LinkedInIcon size={22} className="text-blue-400" /> },
  'Instagram': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25', icon: <InstagramIcon size={22} className="text-pink-400" /> },
  'Facebook': { color: 'text-blue-500', bg: 'bg-blue-600/10', border: 'border-blue-600/25', icon: <FacebookIcon size={22} className="text-blue-500" /> },
  'Twitter/X': { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', icon: <XIcon size={22} className="text-sky-400" /> },
}

function HealthPlanSection({ healthPlan }: { healthPlan: { tem_plano: boolean | null; tipo: string; confianca: string; sinais: string[]; detalhes: Record<string, string> } }) {
  const { tem_plano, tipo, confianca, sinais, detalhes } = healthPlan
  if (!tipo && !confianca && sinais === undefined) return null
  const sinaisArr = Array.isArray(sinais) ? sinais : []
  const color = tem_plano === true ? 'text-emerald-400' : tem_plano === null ? 'text-amber-400' : 'text-slate-400'
  const bg = tem_plano === true ? 'bg-emerald-500/10 border-emerald-500/25' : tem_plano === null ? 'bg-amber-500/10 border-amber-500/25' : 'bg-slate-500/10 border-slate-500/25'
  const icon = tem_plano === true ? '🏥' : tem_plano === null ? '❓' : '⬜'
  const label = tem_plano === true ? 'Plano de Saude Identificado' : tem_plano === null ? 'Verificacao Inconclusiva' : 'Plano Nao Identificado'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🏥</span>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Plano de Saude</span>
      </div>
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${color}`}>{label}</p>
          <p className="text-[11px] text-slate-400">Tipo: {tipo || '-'} | Confianca: {confianca || '-'}</p>
          {sinaisArr.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {sinaisArr.map((s, i) => (
                <p key={i} className="text-[10px] text-slate-500">• {s}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmployeeCountSection({ employeeCount }: { employeeCount: { funcionarios: number | null; fonte: string; confianca: string; faixa: string; detalhes?: Record<string, string> } }) {
  const { funcionarios, fonte, confianca, faixa, detalhes } = employeeCount
  if (!fonte) return null

  const isExact = funcionarios !== null
  const isEstimate = fonte === 'estimativa_cnae_porte'
  const isLinkedin = fonte === 'linkedin'
  const color = isExact ? 'text-emerald-400' : isLinkedin ? 'text-blue-400' : isEstimate ? 'text-sky-400' : 'text-amber-400'
  const bg = isExact ? 'bg-emerald-500/10 border-emerald-500/25' : isLinkedin ? 'bg-blue-500/10 border-blue-500/25' : isEstimate ? 'bg-sky-500/10 border-sky-500/25' : 'bg-amber-500/10 border-amber-500/25'
  const icon = isExact ? '👥' : isLinkedin ? '🔗' : isEstimate ? '📊' : '📋'
  const label = isExact
    ? `${funcionarios.toLocaleString('pt-BR')} colaboradores`
    : `Faixa estimada: ${faixa} colaboradores`

  const fonteLabel: Record<string, string> = {
    wikipedia: 'Wikipedia',
    web_search: 'Web Search',
    linkedin: 'LinkedIn',
    estimativa_cnae_porte: 'Estimativa (Porte/CNAE)',
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">👥</span>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Colaboradores</span>
      </div>
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${color}`}>{label}</p>
          <p className="text-[11px] text-slate-400">Fonte: {fonteLabel[fonte] || fonte} | Confianca: {confianca}</p>
          {detalhes?.nota && (
            <p className="text-[10px] text-slate-500">• {detalhes.nota}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SocialMediaSection({ lead }: { lead: ScrapedLead }) {
  const social = lead.SocialMedia
  if (!social || Object.keys(social).length === 0) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔗</span>
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
        <span className="text-slate-500 text-xs ml-2">Nenhuma busca realizada</span>
      </div>
    )
  }

  const found = Object.entries(social).filter(([, v]) => v?.url && !v?.not_found)
  const notFound = Object.entries(social).filter(([, v]) => v?.not_found)

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔗</span>
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Redes Sociais</h3>
        {found.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">
            {found.length} perfil(is)
          </span>
        )}
      </div>

      {found.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {found.map(([platform, data]) => {
            const style = SOCIAL_ICONS[platform] || { color: 'text-slate-400', bg: 'bg-slate-700/10', border: 'border-slate-600/25', icon: '🔗' }
            return (
              <a
                key={platform}
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} hover:brightness-125 transition-all group`}
              >
                <span className="text-2xl flex shrink-0">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold ${style.color} uppercase tracking-wider`}>{platform}</p>
                    {data.source && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        data.source === 'pessoa' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>{data.source}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate group-hover:text-slate-300">{data.title || data.url}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">↗</span>
              </a>
            )
          })}
        </div>
      )}

      {notFound.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {notFound.map(([platform]) => {
            const style = SOCIAL_ICONS[platform] || { color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/30', icon: '🔗' }
            return (
              <span key={platform} className={`px-2 py-1 rounded-lg ${style.bg} border ${style.border} text-[10px] text-slate-500`}>
                {style.icon} {platform} — não encontrado
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}
