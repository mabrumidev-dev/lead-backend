const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

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

// DADOS MOCK POR ENQUANTO. DEPOIS A GENTE CONECTA NO SCRAPER REAL
const DADOS_MOCK = [
  { nome: "Silveiro Advogados", telefone: "(21) 3527-7000", endereco: "Av Rio Branco, 1", ramo: "advogado", cidade: "Rio de Janeiro", estado: "RJ" }
];

app.get('/search', async (req, res) => {
  const { ramo, estado, cidade } = req.query;
  const leads = DADOS_MOCK.filter(l => 
    (!ramo || l.ramo === ramo) && 
    (!estado || l.estado === estado)
  ).map(l => ({...l, status: 'Novo'}));
  
  for (const lead of leads) {
    const { data: existe } = await supabase.from('leads').select('id').eq('telefone', lead.telefone).maybeSingle();
    if (!existe) await supabase.from('leads').insert(lead);
  }
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

app.listen(process.env.PORT || 10000);
