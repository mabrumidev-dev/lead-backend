/**
 * Script de Integração: Zubdata → Mabrumi CRM
 * 
 * Converte dados do Google Maps Scraper (Zubdata) para o formato
 * interno do CRM Mabrumi.
 * 
 * Arquivo de entrada: leads_zubdata.csv
 * Arquivo de saída: leads_import.json
 */

import fs from 'fs';
import path from 'path';

// Formato de saída esperado pelo CRM Mabrumi
interface LeadMabrumi {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  plan?: 'Individual' | 'Empresarial' | 'Grupo';
  status: 'new' | 'contacted' | 'qualified';
  score?: number;
  city?: string;
  source?: string;
  created_at?: string;
}

// Formato de entrada do Zubdata (baseado no que vimos no README)
interface LeadZubdata {
  Name: string;
  Phone: string;
  Address: string;
  Website: string;
  'Total Reviews': string;
  Rating: string;
  // Campos adicionais que podem aparecer
  [key: string]: any;
}

/**
 * Converte um lead do formato Zubdata para o formato Mabrumi
 */
function convertLead(zubdataLead: LeadZubdata): LeadMabrumi {
  const lead: LeadMabrumi = {
    id: generateId(zubdataLead),
    name: zubdataLead.Name || 'Lead sem nome',
    email: zubdataLead.Email || zubdataLead.email || 'contato@lead.com',
    phone: formatPhone(zubdataLead.Phone || zubdataLead.phone || '(00) 0000-0000'),
    age: undefined, // Dados de idade não vêm do Google Maps normalmente
    plan: zubdataLead.Plan || zubdataLead.plan || 'Individual',
    status: zubdataLead.Status || zubdataLead.status || 'new',
    score: zubdataLead.Rating ? parseInt(zubdataLead.Rating) || 70 : 70,
    city: zubdataLead.Address ? extractCity(zubdataLead.Address) : undefined,
    source: 'Google Maps',
    created_at: new Date().toISOString(),
  };

  return lead;
}

/**
 * Gera um ID único para o lead
 */
function generateId(lead: any): string {
  // Baseia-se no nome + telefone para criar um ID único
  const base = (lead.Name || lead.Phone || 'lead').toLowerCase().replace(/\s+/g, '-');
  return `lead-${Date.now()}-${Math.random().toString(36).substr(2, 8)}-${base.substr(0, 8)}`;
}

/**
 * Formata número de telefone para o padrão do CRM
 */
function formatPhone(phone: string): string {
  // Remove caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Formato: (XX) XXXXX-XXXX (Brasil)
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  } else if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 10)}`;
  }
  
  return phone; // Retorna original se não conseguir formatar
}

/**
 * Extrai a cidade do endereço
 */
function extractCity(address: string): string {
  if (!address) return undefined;
  
  // Tenta encontrar cidade em formato "Cidade, Estado" ou "Cidade/Estado"
  const matches = address.match(/([A-Za-zÀ-ÿ\s]+),\s*[A-Z]{2}/i);
  if (matches) return matches[1].trim();
  
  // Tenta encontrar apenas a primeira parte do endereço
  const parts = address.split(',');
  if (parts.length > 0) return parts[0].trim();
  
  return address;
}

/**
 * Converte um arquivo CSV do Zubdata para o formato Mabrumi
 */
async function convertCsvToMabrumi(csvPath: string, outputPath: string): Promise<void> {
  console.log(`🔄 Convertendo ${csvPath} para formato Mabrumi...`);
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      console.error('❌ Arquivo CSV vazio ou com formato inválido');
      return;
    }
    
    // Primeira linha é o cabeçalho
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Converter cada linha
    const leads: LeadMabrumi[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const leadData: any = {};
      
      // Mapear headers para valores
      headers.forEach((header, index) => {
        leadData[header] = index < values ? values[index] : '';
      });
      
      // Converter para formato Mabrumi
      const lead = convertLead(leadData);
      leads.push(lead);
    }
    
    // Gerar arquivo de saída
    const outputFile = outputPath || path.join(process.cwd(), 'leads_import.json');
    fs.writeFileSync(outputFile, JSON.stringify(leads, null, 2), 'utf-8');
    
    console.log(`✅ Conversão concluída! ${leads.length} leads convertidos`);
    console.log(`📁 Arquivo salvo em: ${outputFile}`);
    
    // Estatísticas
    const qualified = leads.filter(l => l.status === 'qualified').length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    
    console.log(`📊 Estatísticas:`);
    console.log(`   • Qualificados: ${qualified}`);
    console.log(`   • Contatados: ${contacted}`);
    console.log(`   • Novos: ${newLeads}`);
    
  } catch (error) {
    console.error('❌ Erro durante conversão:', error);
    throw error;
  }
}

/**
 * Lista arquivos CSV na pasta especificada
 */
function listCsvFiles(directory: string): string[] {
  try {
    const files = fs.readdirSync(directory)
      .filter(file => file.toLowerCase().endsWith('.csv'));
    return files;
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
    return [];
  }
}

/**
 * Ponto de entrada principal
 */
async function main() {
  console.log('=== Script de Integração: Zubdata → Mabrumi CRM ===\n');
  
  // Procurar por arquivos CSV na pasta atual ou especificada
  const csvFiles = listCsvFiles(process.cwd());
  
  if (csvFiles.length === 0) {
    console.log('⚠️  Nenhum arquivo CSV encontrado na pasta atual.');
    console.log('   Coloque um arquivo "leads_zubdata.csv" na pasta do CRM');
    console.log('   ou forneça o caminho completo:');
    console.log('   node int-import.js /caminho/para/arquivo.csv');
    return;
  }
  
  if (csvFiles.length === 1) {
    const csvPath = path.join(process.cwd(), csvFiles[0]);
    const outputPath = path.join(process.cwd(), 'leads_import.json');
    
    console.log(`📁 Arquivo encontrado: ${csvFiles[0]}`);
    console.log(`📤 Saída: ${outputPath}\n`);
    
    await convertCsvToMabrumi(csvPath, outputPath);
  } else {
    console.log('📂 Múltiplos arquivos CSV encontrados:');
    csvFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('\n🤔 Processando primeiro arquivo encontrado...\n');
    
    const csvPath = path.join(process.cwd(), csvFiles[0]);
    const outputPath = path.join(process.cwd(), 'leads_import.json');
    
    await convertCsvToMabrumi(csvPath, outputPath);
  }
}

// Executar main
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});