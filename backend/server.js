const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// 1. Configurações Globais do CORS (Sempre no topo)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Resposta rápida para Preflight (OPTIONS) compatível com Express atual
app.options(/(.*)/, cors());

// Suporte para buffers binários puros de até 50MB (usado no Upload de blocos)
app.use(express.raw({ type: "application/octet-stream", limit: "50mb" }));

// 2. Definição das Rotas
app.get("/ping", (req, res) => {
    res.json({ pong: true });
});

app.get("/download", (req, res) => {
    res.sendFile(
        path.join(__dirname, "testfiles", "100mb.bin")
    );
});

app.post("/upload", (req, res) => {
    const bytes = req.body ? req.body.length : 0;
    res.json({ received: bytes });
});

// 3. Inicialização
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor iniciado");
});