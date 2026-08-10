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
  res.json({ status: "Backend OK - Só pra Salvar" });
});

// ROTA NOVA: SÓ RECEBE E SALVA
app.post('/save-leads', async (req, res) => {
  try {
    const leads = req.body;
    if (!leads || leads.length === 0) return res.status(400).json({ error: "Array vazio" });

    const { error } = await supabase.from('leads').insert(leads);
    if (error) throw error;

    res.json({ success: true, saved: leads.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
