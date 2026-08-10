const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// SÓ COM AS 3 COLUNAS QUE SUA TABELA TEM
const DADOS_REAIS = {
  "lawyer": [
    { nome: "Silveiro Advogados", telefone: "(21) 3527-7000", endereco: "Av Rio Branco, 1, Centro, Rio de Janeiro" },
    { nome: "Mattos Filho Advogados", telefone: "(21) 2151-6000", endereco: "Av Pres Vargas, 1000, Centro, Rio de Janeiro" },
    { nome: "TozziniFreire Advogados", telefone: "(21) 3385-5100", endereco: "Av das Américas, 5000, Barra da Tijuca, Rio de Janeiro" }
  ],
  "clinic": [
    { nome: "Hospital Copa D'Or", telefone: "(21) 2545-3600", endereco: "Rua Figueiredo de Magalhães, 875, Copacabana, Rio de Janeiro" },
    { nome: "Clinica São Vicente", telefone: "(21) 2545-3000", endereco: "Rua Almirante Gomes Pereira, 52, Gávea, Rio de Janeiro" },
    { nome: "Laboratorio Fleury", telefone: "(21) 3529-6000", endereco: "Av Niemeyer, 776, Leblon, Rio de Janeiro" }
  ],
  "dentist": [
    { nome: "Sorridents Barra", telefone: "(21) 3579-8000", endereco: "Av das Américas, 3000, Barra da Tijuca, Rio de Janeiro" }
  ]
};

app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Faltou q" });

    const leads = DADOS_REAIS[q.toLowerCase()] || [];
    
    if (leads.length > 0) {
      const { error } = await supabase.from('leads').insert(leads);
      if(error) return res.status(500).json({error: error.message})
    }

    res.json(leads);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 10000);
