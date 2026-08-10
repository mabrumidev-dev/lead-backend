const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// CONFIG SUPABASE
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_KEY;

// FUNÇÃO COM DELAY PRA NÃO TOMAR 429
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchPlaces(query, pageToken = null) {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  if (pageToken) url += `&pagetoken=${pageToken}`;
  
  const response = await axios.get(url);
  await sleep(2000); // Espera 2s por causa do pageToken do Google
  return response.data;
}

// ROTA PRINCIPAL
app.post('/api/leads/search', async (req, res) => {
  try {
    const { cidade, bairro, ramo } = req.body;
    if (!cidade || !ramo) return res.status(400).json({ error: 'cidade e ramo são obrigatórios' });

    const queries = [
      `${ramo} em ${cidade} ${bairro}`,
      `${ramo} perto de ${cidade}`,
      `melhor ${ramo} ${cidade}`
    ];

    let allPlaces = [];

    for (const query of queries) {
      let pageToken = null;
      do {
        const data = await searchPlaces(query, pageToken);
        if (data.results) allPlaces = allPlaces.concat(data.results);
        pageToken = data.next_page_token;
        await sleep(1000); // 1s entre cada query
      } while (pageToken && allPlaces.length < 60); // pega até 3 páginas
    }

    // Remove duplicados pelo place_id
    const uniquePlaces = Array.from(new Map(allPlaces.map(p => [p.place_id, p])).values()).slice(0, 50);

    // FORMATA PRA SALVAR NO SUPABASE
    const leadsToInsert = uniquePlaces.map(place => ({
      nome: place.name,
      telefone: null, // Telefone só pega no details, depois a gente faz
      endereco: place.formatted_address,
      cidade: cidade,
      ramo: ramo,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      fonte: 'Google Maps'
    }));

    const { error } = await supabase.from('leads').insert(leadsToInsert);
    if (error) throw error;

    res.json({ message: 'Busca concluída e salva no banco', total: leadsToInsert.length });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ROTA PRA LER OS LEADS
app.get('/api/leads', async (req, res) => {
  const { cidade } = req.query;
  let query = supabase.from('leads').select('*');
  if (cidade) query = query.eq('cidade', cidade);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
