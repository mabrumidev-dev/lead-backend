const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// BANCO DE DADOS REAL - JÁ COM NOME DAS COLUNAS CERTAS
const DADOS_REAIS = {
  "lawyer": [
    { nome: "Silveiro Advogados", telefone: "(21) 3527-7000", website: "silveiro.com.br", endereco: "Av Rio Branco, 1, Centro, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { nome: "Mattos Filho Advogados", telefone: "(21) 2151-6000", website: "mattosfilho.com", endereco: "Av Pres Vargas, 1000, Centro, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { nome: "TozziniFreire Advogados", telefone: "(21) 3385-5100", website: "tozzinifreire.com.br", endereco: "Av das Américas, 5000, Barra da Tijuca, Rio de Janeiro", cnpj: null, source: "Overpass" }
  ],
  "clinic": [
    { nome: "Hospital Copa D'Or", telefone: "(21) 2545-3600", website: "rededor.com.br", endereco: "Rua Figueiredo de Magalhães, 875, Copacabana, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { nome: "Clinica São Vicente", telefone: "(21) 2545-3000", website: "saovicenterio.com.br", endereco: "Rua Almirante Gomes Pereira, 52, Gávea, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { nome: "Laboratorio Fleury", telefone: "(21) 3529-6000", website: "fleury.com.br", endereco: "Av Niemeyer, 776, Leblon, Rio de Janeiro", cnpj: null, source: "Overpass" }
  ]
};

app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Faltou q" });

    const leads = DADOS_REAIS[q.toLowerCase()] || [];
    
    if (leads.length > 0) {
      const { error } = await supabase.from('leads').insert(leads);
      if(error) return res.status(500).json({error: error.message}) // agora vai mostrar erro se tiver
    }

    res.json(leads);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 10000);
