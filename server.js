const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Coordenadas do centro das cidades principais
const CIDADES_COORD = {
  "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  "Belo Horizonte": { lat: -19.9167, lon: -43.9345 }
}

app.post('/api/leads/search', async (req, res) => {
  const { cidade, bairro, ramo } = req.body;
  const coords = CIDADES_COORD[cidade];

  if (!coords) {
    return res.status(400).json({ error: "Cidade não cadastrada. Use: Rio de Janeiro, São Paulo, Belo Horizonte" });
  }

  // Busca por raio de 5000 metros = 5km
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="lawyer"](around:5000,${coords.lat},${coords.lon});
      way["amenity"="lawyer"](around:5000,${coords.lat},${coords.lon});
      relation["amenity"="lawyer"](around:5000,${coords.lat},${coords.lon});
    );
    out center;
  `;

  try {
    const osmRes = await axios.post('https://z.overpass-api.de/api/interpreter', overpassQuery, {
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'LeadBackend/1.0'
      }
    });
    const places = osmRes.data.elements;

    const leads = places.map((place) => {
      return {
        nome: place.tags?.name || 'Sem Nome',
        endereco: place.tags?.['addr:street'] || cidade,
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

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
