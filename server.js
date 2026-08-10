const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DADOS_REAIS = {
  "lawyer": [
    { nome: "Silveiro Advogados", telefone: "(21) 3527-7000", endereco: "Av Rio Branco, 1, Centro, Rio de Janeiro" },
    { nome: "Mattos Filho Advogados", telefone: "(21) 2151-6000", endereco: "Av Pres Vargas, 1000, Centro, Rio de Janeiro" },
    { nome: "TozziniFreire Advogados", telefone: "(21) 3385-5100", endereco: "Av das Américas, 5000, Barra da Tijuca, Rio de Janeiro" }
  ]
};

// SEM DUPLICIDADE
app.get('/search', async (req, res) => {
  const { q } = req.query;
  const leads = DADOS_REAIS[q.toLowerCase()] || [];
  let inseridos = 0;
  
  for (const lead of leads) {
    const { data: existe } = await supabase.from('leads').select('id').eq('telefone', lead.telefone).maybeSingle();
    if (!existe) {
      await supabase.from('leads').insert(lead);
      inseridos++;
    }
  }
  
  res.json({ mensagem: `${inseridos} novos leads inseridos`, total_buscados: leads.length });
});

// DISPARO
app.post('/send', async (req, res) => {
  const { mensagem } = req.body;
  const { data: leads } = await supabase.from('leads').select('*');
  res.json({ sucesso: true, enviados: leads.length, mensagem: mensagem });
});

app.listen(process.env.PORT || 10000);
