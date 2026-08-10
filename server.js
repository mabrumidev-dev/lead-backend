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

app.get('/', (req, res) => {
  res.json({ status: "Backend Online FREE" });
});

app.get('/search', async (req, res) => {
  try {
    const { q, city } = req.query;
    if (!q || !city) return res.status(400).json({ error: "Faltou q ou city" });

    // BUSCA SÓ NO OVERPASS - 100% GRATIS E FUNCIONA NO RENDER FREE
    const overpassQuery = `
      [out:json][timeout:25];
      area["name"="${city}"]->.searchArea;
      (
        node["amenity"="${q}"]["name"](area.searchArea);
        way["amenity"="${q}"]["name"](area.searchArea);
        node["office"="${q}"]["name"](area.searchArea);
        way["office"="${q}"]["name"](area.searchArea);
      );
      out center 50;
    `;

    const overpassRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery);
    const elements = overpassRes.data.elements || [];

    let leads = elements.map(el => ({
      name: el.tags.name || "Sem nome",
      phone: el.tags.phone || el.tags['contact:phone'] || null,
      website: el.tags.website || null,
      address: `${el.tags['addr:street'] || ''} ${el.tags['addr:housenumber'] || ''}, ${city}`,
      cnpj: null, // vamos buscar depois
      source: "Overpass"
    }));

    // SALVA NO SUPABASE
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
