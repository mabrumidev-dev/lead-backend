const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ROTA PARA BUSCAR ADVOGADOS
app.post('/api/leads/search', async (req, res) => {
  const { cidade, bairro, ramo } = req.body;

  const overpassQuery = `
    [out:json][timeout:25];
    area["name"="${cidade}"]->.cidade;
    area["name"="${bairro}"](area.cidade)->.bairro;
    (
      node["amenity"="lawyer"](area.bairro);
      way["amenity"="lawyer"](area.bairro);
      relation["amenity"="lawyer"](area.bairro);
    );
    out center;
  `;

  try {
    const osmRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery);
    const places = osmRes.data.elements;

    const leads = places.map((place) => {
      return {
        nome: place.tags?.name || 'Sem Nome',
        endereco: place.tags?.['addr:street'] || `${bairro}, ${cidade}`,
        telefone: place.tags?.phone || place.tags?.['contact:phone'] || null,
        lat: place.lat || place.center?.lat,
        lng: place.lon || place.center?.lon
      }
    });

    res.json({ total: leads.length, leads: leads });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('API de Leads Online! Use POST /api/leads/search');
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
