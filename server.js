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
  res.json({ status: "Backend Online - Com Fetch" });
});

app.get('/search', async (req, res) => {
  try {
    const { q, city } = req.query;
    if (!q || !city) return res.status(400).json({ error: "Faltou q ou city" });

    // USA FETCH NATIVO EM VEZ DE AXIOS - RENDER FREE DEIXA PASSAR
    const overpassQuery = `[out:json][timeout:25];area["name"="${city}"]->.a;(node["amenity"="${q}"]["name"](area.a);way["amenity"="${q}"]["name"](area.a);out center 20;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    const overpassRes = await fetch(url);
    const data = await overpassRes.json();
    const elements = data.elements || [];

    let leads = elements.map(el => ({
      name: el.tags.name || "Sem nome",
      phone: el.tags.phone || el.tags['contact:phone'] || null,
      website: el.tags.website || null,
      address: `${el.tags['addr:street'] || ''} ${el.tags['addr:housenumber'] || ''}, ${city}`,
      cnpj: null,
      source: "Overpass"
    }));

    if (leads.length > 0) {
      await supabase.from('leads').insert(leads);
    }

    res.json(leads);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
