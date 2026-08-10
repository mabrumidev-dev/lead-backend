const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/', (req,res) => res.send('Mabrumi Backend ON'));

app.post('/search-leads', async (req,res) => {
  const { profession, state } = req.body;
  console.log(`Buscando: ${profession} ${state}`);
  
  try {
    // Busca fake pra testar. Depois trocamos pela API real
    const leads = [
      {nome: `Clinica ${profession} ${state} 1`, telefone: '(11) 99999-0001', status: 'Novo'},
      {nome: `Clinica ${profession} ${state} 2`, telefone: '(11) 99999-0002', status: 'Novo'},
      {nome: `Clinica ${profession} ${state} 3`, telefone: '(11) 99999-0003', status: 'Novo'}
    ];
    
    // Salva no Supabase
    await supabase.from('leads').insert(leads);
    
    console.log(`Encontrados: ${leads.length}`);
    res.json(leads);
  } catch(e) {
    console.log("Erro:", e.message)
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na ${PORT}`));
