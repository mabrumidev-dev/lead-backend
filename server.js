const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const CIDADES_COORD = {
  "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  "Belo Horizonte": { lat: -19.9167, lon: -43.9345 },
  "Curitiba": { lat: -25.4296, lon: -49.2713 }
}

app.post('/api/leads/search', async (req, res) => {
  const { cidade, bairro, ramo } = req.body;
  const coords = CIDADES_COORD[cidade];

  if (!coords) {
    return res.status(400).json({ error: "Cidade não cadastrada" });
  }

  // Timeout de 30s e limite de 50 resultados
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
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'LeadBackend/1.0'
      },
      timeout: 35000 // 35s pro axios
    });
    
    const places = osmRes.data.elements;

    const leads = places.map((place) => {
      return {
        nome: place.tags?.name || 'Sem Nome',
        endereco: place.tags?.['addr:street'] || place.tags?.['addr:city'] || cidade,
        telefone: place.tags?.phone || place.tags?.['contact:phone'] || null,
        lat: place.lat || place.center?.lat,
        lng: place.lon || place.center?.lon
      }
    });

    res.json({ total: leads.length, leads: leads });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Erro ao buscar dados. Tente outra cidade." });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
