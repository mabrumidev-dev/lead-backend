const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Faltou q" });

    // BUSCA POR RAIO DE 10KM NO CENTRO DO RJ - SEMPRE ACHA ALGO
    const lat = -22.9068;
    const lon = -43.1729;
    const overpassQuery = `[out:json][timeout:25];(node["office"="${q}"](around:10000,${lat},${lon});way["office"="${q}"](around:10000,${lat},${lon}););out center 30;`;
    
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://overpass-api.de/api/interpreter?data=${overpassQuery}`)}`;
    const overpassRes = await fetch(proxyUrl);
    const data = await overpassRes.json();

    let leads = (data.elements || []).map(el => ({
      name: el.tags.name || "Sem nome",
      phone: el.tags.phone || null,
      website: el.tags.website || null,
      address: el.tags['addr:full'] || 'Rio de Janeiro',
      cnpj: null,
      source: "Overpass RJ"
    }));

    if (leads.length > 0) await supabase.from('leads').insert(leads);
    res.json(leads);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 10000);
