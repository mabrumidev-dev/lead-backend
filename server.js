const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.get('/', (req, res) => {
  res.json({ status: "Backend Online - Versao Ultra Free" });
});

// ROTA QUE RETORNA DADOS MOCK SÓ PRA TESTAR
app.get('/search', async (req, res) => {
  const { q, city } = req.query;
  
  const mockLeads = [
    {
      name: `${q} Teste 1`,
      phone: "(21) 99999-9999",
      address: `Rua Teste, ${city}`,
      cnpj: null,
      source: "Mock"
    },
    {
      name: `${q} Teste 2`, 
      phone: "(21) 98888-8888",
      address: `Av Teste, ${city}`,
      cnpj: null,
      source: "Mock"
    }
  ];

  // Salva no supabase
  await supabase.from('leads').insert(mockLeads);

  res.json(mockLeads);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
