const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// USA SÓ 1 CHAVE. SERVICE_KEY é melhor pra backend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// BANCO DE DADOS DE RAMOS
const RAMOS = {
  "advogado": ["advogado", "escritorio de advocacia", "advocacia"],
  "dentista": ["dentista", "clinica odontologica", "ortodontia"],
  "corretor": ["corretor de imoveis", "imobiliaria", "venda de imoveis"],
  "clinica": ["clinica medica", "medico", "posto de saude"],
  "academia": ["academia", "crossfit", "pilates"],
  "restaurante": ["restaurante", "lanchonete", "pizzaria"]
};

app.get('/', (req,res) => res.send('Mabrumi Backend ON'));

// DADOS MOCK PRA TESTAR
const DADOS_MOCK = [
  { nome: "Silveiro Advogados", telefone: "(21) 3527-7000", endereco: "Av Rio Branco, 1", ramo: "advogado", cidade: "Rio de Janeiro", estado: "RJ" },
  { nome: "Clinica Sorriso SP", telefone: "(11) 99999-0001", endereco: "Av Paulista, 100", ramo: "dentista", cidade: "Sao Paulo", estado: "SP" },
  { nome: "Clinica Sorriso RJ", telefone: "(21) 99999-0002", endereco: "Copacabana, 200", ramo: "dentista", cidade: "Rio de Janeiro", estado: "RJ" }
];

// ROTA QUE O CRM USA
app.post('/search-leads', async (req,res) => {
  const { profession, state } = req.body;
  console.log(`Buscando: ${profession} ${state}`);

  const leads = DADOS_MOCK.filter(l => 
    l.ramo === profession && l.estado === state
  ).map(l => ({...l, status: 'Novo'}));

  // Salva no Supabase se não existir
  for (const lead of leads) {
    const { data: existe } = await supabase.from('leads').select('id').eq('telefone', lead.telefone).maybeSingle();
    if (!existe) await supabase.from('leads').insert(lead);
  }

  console.log(`Encontrados: ${leads.length}`);
  res.json(leads);
});

app.get('/leads', async (req, res) => {
  const { data } = await supabase.from('leads').select('*').order('created_at', {ascending: false});
  res.json(data);
});

app.post('/send', async (req, res) => {
  const { mensagem } = req.body;
  const script = mensagem || "Olá, sou da Mabrumi e posso te ajudar a captar mais clientes.";
  const { data: leads } = await supabase.from('leads').select('*');
  res.json({ sucesso: true, enviados: leads.length, script_usado: script });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Rodando na ${PORT}`));
