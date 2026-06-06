const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// 1. Configurações Globais de Segurança e Dados (Sempre no topo!)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Resposta rápida para requisições OPTIONS (Preflight de segurança) usando Regex aceito pelo Express
app.options(/(.*)/, cors());

// Permitir receber arquivos binários brutos no corpo da requisição (usado no Upload)
app.use(express.raw({ type: "application/octet-stream", limit: "50mb" }));

// 2. Rotas da API
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

// 3. Inicialização do Servidor na Porta Certa
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor iniciado");
});