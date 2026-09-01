import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/hooks/useLeads'
import { Lead } from '@/types/lead'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

interface ParsedLead {
  name: string; phone: string; email: string; city: string; plan: string;
  source: string; score: number; status: 'new'; age: null; created_at: string; raw: Record<string, string>
}

interface ImportLeadsProps { onImportComplete: (leads: Lead[]) => void; onBack: () => void }

const FIELD_MAP: Record<string, keyof ParsedLead> = {
  'name': 'name', 'nome': 'name', 'title': 'name', 'phone': 'phone', 'telefone': 'phone',
  'tel': 'phone', 'whatsapp': 'phone', 'mobile': 'phone', 'city': 'city', 'cidade': 'city',
  'address': 'city', 'endereco': 'city', 'locality': 'city', 'email': 'email', 'website': 'email',
  'website 1': 'email', 'category': 'plan', 'nicho': 'plan', 'plano': 'plan',
  'rating': 'score', 'total reviews': 'score', 'reviews': 'score',
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = ''; let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else current += char
  }
  result.push(current.trim()); return result
}

function mapScore(rating: string | null, reviews: string | null): number {
  const r = parseFloat(rating || '0'); const rev = parseInt(reviews || '0', 10)
  if (r === 0 && rev === 0) return 50
  return Math.round((r / 5) * 60 + Math.min(rev / 100, 1) * 40)
}

export const ImportLeads: React.FC<ImportLeadsProps> = ({ onImportComplete, onBack }) => {
  const [csvData, setCsvData] = useState('')
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => { const text = event.target?.result as string; setCsvData(text); parseCSV(text) }
    reader.readAsText(file)
  }, [])

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim()); if (lines.length < 2) return
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
    const leads: ParsedLead[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]); if (values.length < 2) continue
      const row: Record<string, string> = {}; headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      const mapped: ParsedLead = { name: '', phone: '', email: '', city: '', plan: 'Individual', source: 'import', score: 50, status: 'new', age: null, created_at: new Date().toISOString(), raw: row }
      for (const [csvHeader, value] of Object.entries(row)) {
        for (const [keyword, field] of Object.entries(FIELD_MAP)) {
          if (csvHeader.includes(keyword) && value) {
            if (field === 'score') mapped[field] = mapScore(value, row['total reviews'] || row['reviews'] || null)
            else if (field === 'plan') { const l = value.toLowerCase(); if (l.includes('saude') || l.includes('health')) mapped.plan = 'Empresarial'; else if (l.includes('seguro') || l.includes('insurance')) mapped.plan = 'Grupo'; else mapped.plan = value }
            else (mapped as any)[field] = value
            break
          }
        }
      }
      if (mapped.name || mapped.phone) leads.push(mapped)
    }
    setParsedLeads(leads); setSelectedLeads(new Set(leads.map((_, i) => i)))
  }

  const handleImport = async () => {
    setImporting(true); const toImport = parsedLeads.filter((_, i) => selectedLeads.has(i)); let success = 0; let failed = 0
    for (const lead of toImport) {
      try { const { error } = await supabase.from('leads').insert({ nome: lead.name, telefone: lead.phone, cidade: lead.city || null, plano: lead.plan, score: lead.score }); if (error) throw error; success++ } catch { failed++ }
    }
    setImportResult({ success, failed }); setImporting(false)
    if (success > 0) {
      onImportComplete(toImport.map((l, i) => ({ id: `import-${Date.now()}-${i}`, name: l.name, phone: l.phone, email: l.email, city: l.city, plan: l.plan as Lead['plan'], age: l.age, score: l.score, source: 'website' as const, status: 'new' as const, created_at: l.created_at })))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Upload size={24} className="text-cyan-400" /> Importar CSV
          </h2>
          <p className="text-sm text-slate-500 mt-1">Importe leads de qualquer arquivo CSV</p>
        </div>
      </div>

      {parsedLeads.length === 0 ? (
        <div className="space-y-4">
          <div onClick={() => fileInputRef.current?.click()} className="glass p-12 text-center cursor-pointer hover:border-cyan-500/30 transition-all">
            <FileText size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">Arraste ou clique para selecionar</p>
            <p className="text-slate-600 text-sm">Formatos: .csv, .txt</p>
            {fileName && <p className="text-cyan-400 text-sm mt-2">{fileName}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          <div className="text-center text-slate-600 text-sm">ou cole o CSV abaixo</div>
          <textarea
            placeholder={`Nome,Telefone,Cidade\nMaria Silva,(11) 99999-1111,São Paulo`}
            value={csvData} onChange={e => { setCsvData(e.target.value); if (e.target.value.trim()) parseCSV(e.target.value) }}
            rows={8} className="input-field font-mono text-sm resize-none"
          />
        </div>
      ) : importResult ? (
        <div className="glass p-8 text-center animate-scale-in">
          {importResult.success > 0 && (
            <div className="mb-4">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-emerald-400">{importResult.success} leads importados!</h3>
            </div>
          )}
          {importResult.failed > 0 && (
            <div className="mb-4">
              <AlertTriangle size={48} className="text-amber-400 mx-auto mb-3" />
              <p className="text-amber-400">{importResult.failed} falharam</p>
            </div>
          )}
          <button onClick={onBack} className="btn-ghost mt-4">Voltar</button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-slate-400"><span className="text-white font-bold">{parsedLeads.length}</span> leads <span className="text-slate-600 ml-1">({selectedLeads.size} selecionados)</span></p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedLeads(new Set(parsedLeads.map((_, i) => i)))} className="text-xs text-cyan-400 hover:underline">Todos</button>
              <button onClick={() => setSelectedLeads(new Set())} className="text-xs text-slate-400 hover:underline">Limpar</button>
            </div>
          </div>

          <div className="glass overflow-hidden max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead><tr><th className="w-10"><input type="checkbox" checked={selectedLeads.size === parsedLeads.length} onChange={e => setSelectedLeads(e.target.checked ? new Set(parsedLeads.map((_, i) => i)) : new Set())} /></th><th>Nome</th><th>Telefone</th><th>Cidade</th><th>Plano</th><th>Score</th></tr></thead>
              <tbody>
                {parsedLeads.map((lead, i) => (
                  <tr key={i} className={selectedLeads.has(i) ? 'selected' : ''}>
                    <td><input type="checkbox" checked={selectedLeads.has(i)} onChange={e => { const n = new Set(selectedLeads); if (e.target.checked) n.add(i); else n.delete(i); setSelectedLeads(n) }} /></td>
                    <td className="text-white">{lead.name || <span className="text-slate-600">—</span>}</td>
                    <td className="text-cyan-400">{lead.phone || <span className="text-slate-600">—</span>}</td>
                    <td>{lead.city || <span className="text-slate-600">—</span>}</td>
                    <td><span className="badge badge-cyan">{lead.plan}</span></td>
                    <td><span className={`font-medium ${lead.score >= 75 ? 'text-emerald-400' : lead.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{lead.score}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={handleImport} disabled={selectedLeads.size === 0 || importing} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {importing ? 'Importando...' : `Importar ${selectedLeads.size} leads`}
            </button>
            <button onClick={() => { setParsedLeads([]); setCsvData(''); setFileName('') }} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
