const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ROTA DE TESTE
app.get('/', (req, res) => {
  res.json({ status: "Backend Online" });
});

// ROTA PRINCIPAL DE BUSCA
app.get('/search', async (req, res) => {
  try {
    const { q, city } = req.query;
    if (!q || !city) return res.status(400).json({ error: "Faltou q ou city" });

    console.log(`Buscando: ${q} em ${city}`);

    // 1. BUSCA NO OVERPASS - GRATIS
    const overpassQuery = `
      [out:json][timeout:25];
      area["name"="${city}"]->.searchArea;
      (
        node["office"="${q}"]["name"](area.searchArea);
        way["office"="${q}"]["name"](area.searchArea);
      );
      out center 50;
    `;

    const overpassRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery);
    const elements = overpassRes.data.elements || [];

    let leads = [];

    // 2. PRA CADA RESULTADO BUSCA CNPJ
    for (const el of elements) {
      const name = el.tags.name;
      
      // Tenta achar CNPJ pelo nome
      try {
        const cnpjRes = await axios.get(`https://publica.cnpj.ws/cnpj/${name.replace(/\s/g, '')}`);
        if (cnpjRes.data) {
          leads.push({
            name: name,
            cnpj: cnpjRes.data.estabelecimento?.cnpj || null,
            phone: cnpjRes.data.estabelecimento?.ddd1 + cnpjRes.data.estabelecimento?.telefone1 || null,
            address: `${el.tags['addr:street'] || ''}, ${city}`,
            source: "Overpass + CNPJ.ws"
          });
        }
      } catch(e) {
        leads.push({
          name: name,
          cnpj: null,
          phone: null,
          address: `${el.tags['addr:street'] || ''}, ${city}`,
          source: "Overpass"
        });
      }
    }

    // 3. SALVA NO SUPABASE
    if (leads.length > 0) {
      await supabase.from('leads').insert(leads);
    }

    res.json(leads);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
