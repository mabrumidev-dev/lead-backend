const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.get('/api/google/search', async (req, res) => {
    const { query } = req.query;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
});

app.get('/api/google/details', async (req, res) => {
    const { place_id } = req.query;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,formatted_phone_number,website&key=${GOOGLE_API_KEY}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
});

app.get('/api/cnpj/search', async (req, res) => {
    const { nome } = req.query;
    const url = `https://brasilapi.com.br/api/cnpj/v1/search/${encodeURIComponent(nome)}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
});

app.get('/api/cnpj/details/:cnpj', async (req, res) => {
    const { cnpj } = req.params;
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));