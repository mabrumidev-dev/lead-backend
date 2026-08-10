const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// CHAVES DO SUPABASE
const supabaseUrl = 'https://ijbuzlrxuswscfzqacne.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYnV6bHJ4dXN3c2NmenFhY25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE0NTA5MSwiZXhwIjoyMTAxNzIxMDkxfQ.sArfjvPd98lbGJQmu9dCf3CxoALLC0aiGTESvw4nBFw'
const supabase = createClient(supabaseUrl, supabaseKey)

const CIDADES_COORD = {
  "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  "Belo Horizonte": { lat: -19.9167, lon: -43.9345 },
  "Curitiba": { lat: -25.4296, lon: -49.2713 }
}

app.post('/api/leads/search', async (req, res) => {
  const { cidade, bairro, ramo } = req.body;
  const coords = CIDADES_COORD[cidade];
  if (!coords) return res.status(400).json({ error: "Cidade não cadastrada" });

  const overpassQuery = `
    [out:json][timeout:30];
    (
      node["office"="lawyer"](around:8000,${coords.lat},${coords.lon});
      way["office"="lawyer"](around:8000,${coords.lat},${coords.lon});
    );
    out center 50;
  `;

  try {
    const osmRes = await axios.post('https://z.overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'LeadBackend/1.0' },
      timeout: 35000
    });
    
    const places = osmRes.data.elements;

    const leadsParaSalvar = places.map((place) => ({
      nome: place.tags?.name || 'Sem Nome',
      telefone: place.tags?.phone || place.tags?.['contact:phone'] || 'N/A',
      endereco: place.tags?.['addr:street'] || place.tags?.['addr:city'] || cidade,
      cidade: cidade,
      ramo: ramo,
      lat: place.lat || place.center?.lat,
      lng: place.lon || place.center?.lon,
      fonte: 'OpenStreetMap'
    }));

    const { data, error } = await supabase.from('leads').insert(leadsParaSalvar).select()
    if (error) throw error;

    res.json({ total: data.length, leads: data });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// ROTA PRO DASHBOARD LER
app.get('/api/leads', async (req, res) => {
  const { cidade, ramo } = req.query;
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(1000);
  
  if (cidade) query = query.eq('cidade', cidade);
  if (ramo) query = query.eq('ramo', ramo);

  const { data, error } = await query
  if (error) return res.status(500).json({ error })
  res.json(data)
})

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
