const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// 1. Configurações Globais de Segurança e Dados (Sempre no topo!)
app.use(cors({
    origin: '*', // Permite requisições de qualquer origem (como o Netlify)
    methods: ['GET', 'POST', 'OPTIONS'], // Libera explicitamente o POST e o Preflight (OPTIONS)
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Adicione também uma resposta rápida para requisições OPTIONS (Preflight)
app.options('*', cors());
// 2. Servir os arquivos do Frontend
app.use(express.static('frontend'));

// 3. Rotas da API
app.get("/ping", (req, res) => {
    res.json({
        timestamp: Date.now()
    });
});

app.get("/download", (req, res) => {
    res.sendFile(
        path.join(__dirname, "testfiles", "100mb.bin")
    );
});

app.post("/upload", (req, res) => {
    const bytes = req.body ? req.body.length : 0;
    res.json({
        received: bytes
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor iniciado");
});