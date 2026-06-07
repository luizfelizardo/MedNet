const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options(/(.*)/, cors());
app.use(express.raw({ type: "application/octet-stream", limit: "50mb" }));

// --- NOVA ROTA: O SERVIDOR DESCOBRE O ISP DO USUÁRIO ---
app.get("/provider-info", async (req, res) => {
    try {
        // Pega o IP real do usuário passando pelo proxy do Render
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        
        // Limpa caso venha uma lista de IPs separados por vírgula
        const cleanIp = ip ? ip.split(",")[0].trim() : "";

        // Consulta interna via HTTPS para descobrir os dados do IP
        const response = await fetch(`https://ipapi.co/${cleanIp}/json/`);
        const data = await response.json();

        if (data && !data.error) {
            res.json({
                success: true,
                isp: data.org || "Provedor Desconhecido",
                city: data.city || "",
                ip: data.ip || cleanIp
            });
        } else {
            res.json({ success: false });
        }
    } catch (e) {
        console.error("Erro interno ao buscar ISP:", e);
        res.json({ success: false });
    }
});

app.get("/ping", (req, res) => {
    res.json({ pong: true });
});

app.get("/download", (req, res) => {
    res.sendFile(path.join(__dirname, "testfiles", "100mb.bin"));
});

app.post("/upload", (req, res) => {
    const bytes = req.body ? req.body.length : 0;
    res.json({ received: bytes });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor iniciado");
});