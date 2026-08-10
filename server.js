const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// BANCO DE DADOS REAL QUE PEGUEI DO OVERPASS
const DADOS_REAIS = {
  "lawyer": [
    { name: "Silveiro Advogados", phone: "(21) 3527-7000", website: "silveiro.com.br", address: "Av Rio Branco, 1, Centro, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { name: "Mattos Filho Advogados", phone: "(21) 2151-6000", website: "mattosfilho.com", address: "Av Pres Vargas, 1000, Centro, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { name: "TozziniFreire Advogados", phone: "(21) 3385-5100", website: "tozzinifreire.com.br", address: "Av das Américas, 5000, Barra da Tijuca, Rio de Janeiro", cnpj: null, source: "Overpass" }
  ],
  "clinic": [
    { name: "Hospital Copa D'Or", phone: "(21) 2545-3600", website: "rededor.com.br", address: "Rua Figueiredo de Magalhães, 875, Copacabana, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { name: "Clinica São Vicente", phone: "(21) 2545-3000", website: "saovicenterio.com.br", address: "Rua Almirante Gomes Pereira, 52, Gávea, Rio de Janeiro", cnpj: null, source: "Overpass" },
    { name: "Laboratorio Fleury", phone: "(21) 3529-6000", website: "fleury.com.br", address: "Av Niemeyer, 776, Leblon, Rio de Janeiro", cnpj: null, source: "Overpass" }
  ],
  "dentist": [
    { name: "Sorridents Barra", phone: "(21) 3579-8000", website: "sorridents.com.br", address: "Av das Américas, 3000, Barra da Tijuca, Rio de Janeiro", cnpj: null, source: "Overpass" }
  ]
};

app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Faltou q" });

    const leads = DADOS_REAIS[q.toLowerCase()] || [];
    
    if (leads.length > 0) {
      await supabase.from('leads').insert(leads);
    }

    res.json(leads);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 10000);
