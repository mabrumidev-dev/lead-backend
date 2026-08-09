const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. BUSCAR ADVOGADOS NO OSM/OVERPASS
app.post('/api/leads/search', async (req, res) => {
  const { cidade, bairro, ramo } = req.body;
  // Ex: { "cidade": "Rio de Janeiro", "bairro": "Barra da Tijuca", "ramo": "advogado" }

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

    // 2. ENRIQUECER COM CNPJ.WS
    const leads = await Promise.all(places.map(async (place) => {
      const nome = place.tags?.name || 'Sem Nome';
      let cnpjData = {};
      
      try {
        // CNPJ.ws busca por nome da empresa
        const cnpjRes = await axios.get(`https://api.cnpj.ws/cnpj/${encodeURIComponent(nome)}`, {
          timeout: 3000
        });
        cnpjData = cnpjRes.data;
      } catch (e) {
        // Se não achar no CNPJ.ws, segue só com dados do OSM
      }

      return {
        nome: nome,
        endereco: place.tags?.['addr:street'] + ', ' + place.tags?.['addr:city'] || 'Barra da Tijuca',
        telefone: place.tags?.phone || place.tags?.['contact:phone'] || null,
        cnpj: cnpjData.cnpj || null,
        email: cnpjData.email || null,
        lat: place.lat || place.center?.lat,
        lng: place.lon || place.center?.lon
      }
    }));

    res.json({ total: leads.length, leads: leads });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
