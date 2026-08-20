import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/hooks/useLeads'
import { Lead } from '@/types/lead'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

interface ParsedLead {
  name: string
  phone: string
  email: string
  city: string
  plan: string
  source: string
  score: number
  status: 'new'
  age: null
  created_at: string
  raw: Record<string, string>
}

interface ImportLeadsProps {
  onImportComplete: (leads: Lead[]) => void
  onBack: () => void
}

const FIELD_MAP: Record<string, keyof ParsedLead> = {
  'name': 'name',
  'nome': 'name',
  'title': 'name',
  'phone': 'phone',
  'telefone': 'phone',
  'tel': 'phone',
  'whatsapp': 'phone',
  'mobile': 'phone',
  'city': 'city',
  'cidade': 'city',
  'address': 'city',
  'endereco': 'city',
  'locality': 'city',
  'email': 'email',
  'website': 'email',
  'website 1': 'email',
  'category': 'plan',
  'nicho': 'plan',
  'plano': 'plan',
  'rating': 'score',
  'total reviews': 'score',
  'reviews': 'score',
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function mapScore(rating: string | null, reviews: string | null): number {
  const r = parseFloat(rating || '0')
  const rev = parseInt(reviews || '0', 10)
  if (r === 0 && rev === 0) return 50
  const ratingScore = (r / 5) * 60
  const reviewScore = Math.min(rev / 100, 1) * 40
  return Math.round(ratingScore + reviewScore)
}

export const ImportLeads: React.FC<ImportLeadsProps> = ({ onImportComplete, onBack }) => {
  const [csvData, setCsvData] = useState<string>('')
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }, [])

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
    const leads: ParsedLead[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 2) continue

      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })

      const mapped: ParsedLead = {
        name: '',
        phone: '',
        email: '',
        city: '',
        plan: 'Individual',
        source: 'import',
        score: 50,
        status: 'new',
        age: null,
        created_at: new Date().toISOString(),
        raw: row,
      }

      for (const [csvHeader, value] of Object.entries(row)) {
        for (const [keyword, field] of Object.entries(FIELD_MAP)) {
          if (csvHeader.includes(keyword) && value) {
            if (field === 'score') {
              mapped[field] = mapScore(value, row['total reviews'] || row['reviews'] || null)
            } else if (field === 'plan') {
              const lower = value.toLowerCase()
              if (lower.includes('restaurante') || lower.includes('food')) mapped.plan = 'Individual'
              else if (lower.includes('saude') || lower.includes('health')) mapped.plan = 'Empresarial'
              else if (lower.includes('seguro') || lower.includes('insurance')) mapped.plan = 'Grupo'
              else mapped.plan = value
            } else {
              ;(mapped as any)[field] = value
            }
            break
          }
        }
      }

      if (mapped.name || mapped.phone) {
        leads.push(mapped)
      }
    }

    setParsedLeads(leads)
    setSelectedLeads(new Set(leads.map((_, i) => i)))
  }

  const handleImport = async () => {
    setImporting(true)
    const toImport = parsedLeads.filter((_, i) => selectedLeads.has(i))
    let success = 0
    let failed = 0

    for (const lead of toImport) {
      try {
        const { error } = await supabase.from('leads').insert({
          nome: lead.name,
          telefone: lead.phone,
          email: lead.email || null,
          cidade: lead.city || null,
          nicho: lead.plan,
          fonte: 'zubdata',
          score: lead.score,
          status: 'new',
        })

        if (error) throw error
        success++
      } catch {
        failed++
      }
    }

    setImportResult({ success, failed })
    setImporting(false)

    if (success > 0) {
      const importedLeads: Lead[] = toImport.map((l, i) => ({
        id: `import-${Date.now()}-${i}`,
        name: l.name,
        phone: l.phone,
        email: l.email,
        city: l.city,
        plan: l.plan as Lead['plan'],
        age: l.age,
        score: l.score,
        source: 'website' as const,
        status: 'new' as const,
        created_at: l.created_at,
      }))
      onImportComplete(importedLeads)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Upload size={24} className="text-cyan-400" /> Importar Leads (CSV)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Importe leads do Google Maps Scraper (Zubdata) ou qualquer arquivo CSV
          </p>
        </div>
      </div>

      {parsedLeads.length === 0 ? (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-12 text-center cursor-pointer transition-all duration-200 hover:bg-slate-800/30"
          >
            <FileText size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">Arraste um arquivo CSV ou clique para selecionar</p>
            <p className="text-slate-500 text-sm">Formatos aceitos: .csv, .txt</p>
            {fileName && <p className="text-cyan-400 text-sm mt-2">{fileName}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />

          <div className="text-center text-slate-500 text-sm">ou cole o conteúdo do CSV abaixo</div>

          <textarea
            placeholder={`Nome,Telefone,Cidade,Nicho\nMaria Silva,(11) 99999-1111,São Paulo,restaurante\nJoão Santos,(11) 98888-2222,São Paulo,clinica`}
            value={csvData}
            onChange={e => { setCsvData(e.target.value); if (e.target.value.trim()) parseCSV(e.target.value) }}
            rows={8}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>
      ) : (
        <div>
          {importResult ? (
            <div className="text-center p-8">
              {importResult.success > 0 && (
                <div className="mb-4">
                  <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-green-400">{importResult.success} leads importados!</h3>
                  <p className="text-slate-400 mt-2">Os leads foram adicionados ao seu banco de dados.</p>
                </div>
              )}
              {importResult.failed > 0 && (
                <div className="mb-4">
                  <AlertTriangle size={48} className="text-yellow-400 mx-auto mb-3" />
                  <p className="text-yellow-400">{importResult.failed} leads falharam ao importar</p>
                </div>
              )}
              <button onClick={onBack} className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition">
                Voltar para Buscar Leads
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400">
                  <span className="text-white font-bold">{parsedLeads.length}</span> leads encontrados
                  <span className="text-slate-500 ml-2">({selectedLeads.size} selecionados)</span>
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedLeads(new Set(parsedLeads.map((_, i) => i)))} className="text-xs text-cyan-400 hover:underline">Selecionar todos</button>
                  <button onClick={() => setSelectedLeads(new Set())} className="text-xs text-slate-400 hover:underline">Limpar</button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedLeads.size === parsedLeads.length}
                          onChange={e => setSelectedLeads(e.target.checked ? new Set(parsedLeads.map((_, i) => i)) : new Set())}
                          className="accent-cyan-500"
                        />
                      </th>
                      <th className="p-3 text-left">Nome</th>
                      <th className="p-3 text-left">Telefone</th>
                      <th className="p-3 text-left">Cidade</th>
                      <th className="p-3 text-left">Categoria</th>
                      <th className="p-3 text-left">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {parsedLeads.map((lead, i) => (
                      <tr key={i} className={`hover:bg-slate-800/30 transition ${selectedLeads.has(i) ? 'bg-slate-800/20' : ''}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(i)}
                            onChange={e => {
                              const next = new Set(selectedLeads)
                              if (e.target.checked) next.add(i); else next.delete(i)
                              setSelectedLeads(next)
                            }}
                            className="accent-cyan-500"
                          />
                        </td>
                        <td className="p-3 text-white">{lead.name || <span className="text-slate-500">—</span>}</td>
                        <td className="p-3 text-cyan-400">{lead.phone || <span className="text-slate-500">—</span>}</td>
                        <td className="p-3 text-slate-300">{lead.city || <span className="text-slate-500">—</span>}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">{lead.plan}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-sm font-medium ${lead.score >= 75 ? 'text-green-400' : lead.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {lead.score}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleImport}
                  disabled={selectedLeads.size === 0 || importing}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${
                    selectedLeads.size === 0 || importing
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-blue-500/30'
                  }`}
                >
                  {importing ? 'Importando...' : `Importar ${selectedLeads.size} leads`}
                </button>
                <button onClick={() => { setParsedLeads([]); setCsvData(''); setFileName('') }} className="px-6 py-3 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-slate-700 transition">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
